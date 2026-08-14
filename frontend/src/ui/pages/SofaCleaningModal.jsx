import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, Search, ShoppingCart, X, Star } from "lucide-react";
import { apiRequest } from "../../api/client.js";
import { AppBannerAndFooter } from "../components/AppBannerAndFooter.jsx";

const BOOKING_CURRENCY_SYMBOL = "₹";

const SOFA_SUB_TABS = [
  {
    id: "sofa",
    name: "Sofa Cleaning",
    image: "/mockups/sofa_header_new.png",
  },
  {
    id: "mattress",
    name: "Mattress Cleaning",
    image: "/mockups/mattress_header_new.png",
  },
  {
    id: "carpet",
    name: "Carpet Cleaning",
    image: "/mockups/carpet_header_new.png",
  },
  {
    id: "addons",
    name: "Quick Extra Services",
    image: "https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=150&q=80&fit=crop",
  }
];

const SOFA_CLEANING_SERVICES = [
  {
    id: "fabric-sofa-clean",
    name: "Fabric Sofa Cleaning",
    price: 329,
    duration: "1 hr",
    description: "Deep foam cleaning and vacuuming to revitalize fabric sofas.",
    image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=300&q=80&fit=crop",
    includes: [
      "Foam cleaning of sofa seats and backrests",
      "Deep vacuuming to remove dust and dirt",
      "Cleaning of light stains and marks",
      "Loose/removable cushions not included"
    ]
  },
  {
    id: "fabric-sofa-cushion-clean",
    name: "Fabric Sofa & Cushion Cleaning",
    price: 599,
    duration: "1.5 hrs",
    description: "Complete foam cleaning of fabric sofas including all loose cushions.",
    image: "https://images.unsplash.com/photo-1558611848-73f7eb4001a1?w=300&q=80&fit=crop",
    includes: [
      "Foam cleaning of sofa seats and backrests",
      "Deep wet & dry vacuuming",
      "Cleaning of light stains and marks",
      "Loose/removable sofa cushions included"
    ]
  },
  {
    id: "leather-sofa-clean",
    name: "Leather Sofa Cleaning",
    price: 349,
    duration: "1 hr",
    description: "Gentle cleaning and conditioning to restore leather shine.",
    image: "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=300&q=80&fit=crop",
    includes: [
      "Gentle cleaning of leather sofa surfaces",
      "Removal of dust and everyday dirt",
      "Cleaning of seats and backrests",
      "Leather-safe conditioning"
    ]
  },
  {
    id: "leather-sofa-cushion-clean",
    name: "Leather Sofa & Cushion Cleaning",
    price: 619,
    duration: "1.5 hrs",
    description: "Comprehensive leather cleaning and conditioning including cushions.",
    image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=300&q=80&fit=crop",
    includes: [
      "Gentle cleaning of leather sofa seats and backrests",
      "Cleaning of loose/removable leather cushions",
      "Leather-safe conditioning",
      "Soft finishing for a clean appearance"
    ]
  }
];

const MATTRESS_SERVICES = [
  {
    id: "mattress-deep",
    name: "Mattress Deep Cleaning",
    price: 389,
    duration: "1 hr",
    description: "Deep vacuuming and shampoo wash to remove dust mites and stains.",
    image: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=300&q=80&fit=crop",
    includes: [
      "Deep vacuuming to remove dust and dirt",
      "Shampoo cleaning of the mattress surface",
      "Treatment for common stains and marks",
      "Wet vacuuming to remove dirt and moisture"
    ]
  },
  {
    id: "mattress-pillow-refresh",
    name: "Mattress & Pillow Refresh",
    price: 499,
    duration: "1.5 hrs",
    description: "Complete mattress shampooing and pillow deep cleaning.",
    image: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=300&q=80&fit=crop",
    includes: [
      "Deep vacuuming of mattress and pillows",
      "Shampoo cleaning for visible stains",
      "Odour and dirt removal",
      "Wet vacuuming for a fresher finish"
    ]
  }
];

const CARPET_SERVICES = [
  {
    id: "carpet-deep",
    name: "Carpet Cleaning",
    price: 369,
    duration: "1 hr",
    description: "Deep foam shampoo wash to extract deep-seated dirt from carpets.",
    image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=300&q=80&fit=crop",
    includes: [
      "Removal of accumulated dust particles, dirt",
      "Foam based shampooing on the carpet using a sponge",
      "Vacuuming & wiping shampoo"
    ]
  }
];

const SOFA_ADDONS_SERVICES = [
  {
    id: "quick-dining-table",
    name: "Dining Table & Chairs Cleaning",
    price: 449,
    duration: "30 mins",
    description: "Detailed dining table and chairs surface cleaning and grease removal.",
    image: "https://images.unsplash.com/photo-1533090161767-e6ffed986c88?w=300&q=80&fit=crop",
    includes: [
      "Surface cleaning & sanitation of table and chairs",
      "Removal of food stains & greasy layers",
      "Wiping & drying of tabletop"
    ]
  },
  {
    id: "quick-fan-clean",
    name: "Ceiling Fan Cleaning",
    price: 89,
    duration: "30 mins",
    description: "Detailed ceiling fan dusting and blade wipe down.",
    image: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=300&q=80&fit=crop",
    includes: [
      "Fan blade cleaning",
      "Motor housing & cover dusting",
      "Dust & surface grime removal"
    ]
  },
  {
    id: "quick-door-clean",
    name: "Door Cleaning",
    price: 89,
    duration: "10 mins",
    description: "Thorough wiping and dusting of doors to remove fingerprints and dirt.",
    image: "/mockups/bath_door.png",
    includes: [
      "Wiping of door panels and frames",
      "Removal of smudges, dust & fingerprint marks",
      "Handle sanitization"
    ]
  },
  {
    id: "fridge-clean",
    name: "Fridge cleaning",
    rating: "4.83",
    reviews: "167K reviews",
    price: 399,
    options: "3 options",
    duration: "1.5 hrs",
    description: "Thorough interior defrosting and rack-by-rack deep cleaning.",
    image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600&q=80&fit=crop",
    includes: [
      "Interior & exterior cleaning",
      "Shelves, trays & compartments cleaning",
      "Door seal & stain cleaning"
    ],
    subOptions: [
      {
        id: "fridge-single",
        name: "Single door",
        price: 399,
        rating: "4.85",
        reviews: "65K reviews",
        image: "https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=200&q=80&fit=crop",
        duration: "1 hr"
      },
      {
        id: "fridge-double",
        name: "Double door",
        price: 549,
        rating: "4.83",
        reviews: "93K reviews",
        image: "https://images.unsplash.com/photo-1584622781564-1d987f7333c1?w=200&q=80&fit=crop",
        duration: "1.5 hrs"
      },
      {
        id: "fridge-triple",
        name: "Side by side/ Triple door",
        price: 799,
        rating: "4.80",
        reviews: "9K reviews",
        image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=300&q=80&fit=crop",
        duration: "2 hrs"
      }
    ]
  },
  {
    id: "quick-balcony-upto-4ft",
    name: "Balcony Cleaning: Upto 4 ft Width",
    price: 399,
    duration: "30 mins",
    description: "Washing and scrubbing of balcony floor and railings.",
    image: "https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=300&q=80&fit=crop",
    includes: [
      "Balcony floor washing & scrubbing",
      "Dusting of railing and windows",
      "Clearance of cobwebs and dust bunnies"
    ]
  },
  {
    id: "quick-balcony-above-4ft",
    name: "Balcony Cleaning: Above 4 ft Width",
    price: 549,
    duration: "50 mins",
    description: "Deep floor scrubbing and mesh cleaning for large balconies.",
    image: "https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=300&q=80&fit=crop",
    includes: [
      "Deep floor scrubbing & balcony washing",
      "Railing, windows, and mesh cleaning",
      "Thorough dust and dirt clearance"
    ]
  }
];

const SOFA_DETAIL_DATA = {
  "quick-fan-clean": {
    tools: [
      "Extension dusters",
      "Microfiber cloths",
      "Mild cleaning sprays"
    ],
    ready: [
      "Ensure space directly below the fan is clear",
      "Provide access to a power source"
    ],
    reviews: [
      { name: "Vijay S.", rating: "4.9", text: '"Cleaned the fan blades and motor body nicely. Dust-free now."' },
      { name: "Amit K.", rating: "4.8", text: '"Quick service, got rid of all kitchen oil and grease stains on blades."' }
    ],
    faqs: [
      { q: "Do you clean the regulator?", a: "No, we only clean the fan blades, motor housing, and downrod." },
      { q: "Is repair service included?", a: "No, this is strictly a cleaning service. Repairs are not included." },
      { q: "Will my floor get dirty?", a: "No, our professionals use protective sheets to cover your floor." },
      { q: "How long does it take?", a: "It takes around 20-30 minutes per ceiling fan." },
      { q: "Do you clean exhaust fans too?", a: "No, exhaust fan cleaning is a separate service." },
      { q: "Do you clean the fan motor?", a: "We clean the external motor body and cover, but do not open or service internal parts." },
      { q: "Is ladder provided by the technician?", a: "Yes, our team brings all necessary ladders and safety equipment." },
      { q: "Do you clean the switchboards?", a: "No, switchboard cleaning is not covered in this service." }
    ]
  },
  "quick-door-clean": {
    tools: [
      "Wood-safe spray",
      "Soft detailing sponges",
      "Microfiber towels"
    ],
    ready: [
      "Provide clear path to doors"
    ],
    reviews: [
      { name: "Alok R.", rating: "4.8", text: '"Got rid of all grease spots on the door handles and corners."' },
      { name: "Suresh P.", rating: "4.7", text: '"Excellent door wiping. The panels look polished and clean now."' }
    ],
    faqs: [
      { q: "Is handle disinfection included?", a: "Yes, we sanitize door handles as part of the service." },
      { q: "Do you clean the door frames?", a: "Yes, we clean both door panels and frames." },
      { q: "Do you clean glass panels on doors?", a: "Yes, any glass panels are wiped and cleaned with glass cleaner." },
      { q: "Will this service polish wooden doors?", a: "No, this is a cleaning service. We do not apply wood polish or varnish." },
      { q: "How many doors are cleaned?", a: "This service is priced per door. You can select the quantity accordingly." },
      { q: "Do you clean mesh doors?", a: "No, mesh doors require separate pricing/washing." },
      { q: "Do you remove scratches?", a: "No, cleaning cannot repair scratches, dents or structural damage." },
      { q: "Are sliding door tracks cleaned?", a: "Yes, we dust and wipe the accessible sliding track area." }
    ]
  },
  "fridge-clean": {
    tools: [
      "Food-safe cleaning products",
      "Microfiber cloths",
      "Soft scrubbers",
      "Small cleaning brushes"
    ],
    ready: [
      "Remove food items before cleaning",
      "Keep the refrigerator accessible",
      "Keep a power connection available"
    ],
    reviews: [
      { name: "Ananya S.", rating: "5.0", text: '"Very neat cleaning. The shelves and inside of the fridge look fresh now."' },
      { name: "Rahul K.", rating: "4.8", text: '"Good service and the team handled everything carefully."' }
    ],
    faqs: [
      { q: "Do I need to remove the food?", a: "Yes, please remove all food items before cleaning." },
      { q: "Will you clean the freezer?", a: "Yes, accessible freezer areas will be cleaned." },
      { q: "Will you remove bad smell?", a: "We clean food stains and dirt that may cause unpleasant smells." },
      { q: "Is external cleaning included?", a: "Yes, we clean both the interior shelves and exterior doors." },
      { q: "Do you clean the back coils?", a: "No, we only clean interior components, shelves, trays, and exterior doors." },
      { q: "How long does it take?", a: "The service takes approximately 1 to 1.5 hours depending on size." },
      { q: "Do you defrost the freezer?", a: "Yes, please switch off the fridge 1 hour prior to defrost if ice buildup is high." },
      { q: "Are details customized per fridge model?", a: "Yes, our team cleans single door, double door, and triple door refrigerators." }
    ]
  },
  "quick-balcony-upto-4ft": {
    tools: [
      "Floor scrubbers",
      "High pressure water sprays",
      "Hard dusting brushes"
    ],
    ready: [
      "Remove plants or outdoor furniture from the balcony",
      "Ensure access to a water connection"
    ],
    reviews: [
      { name: "Vikram P.", rating: "4.9", text: '"Scrubbed all the dust and dirt from the balcony floor. Very clean."' },
      { name: "Divya N.", rating: "4.8", text: '"The pigeon droppings were cleaned very neatly. Worth the price."' }
    ],
    faqs: [
      { q: "Do you clean balcony windows?", a: "Yes, accessible balcony windows are dusted and wiped." },
      { q: "Is roof cleaning included?", a: "No, ceiling/roof cleaning is not included in this quick package." },
      { q: "Do you wash the railings?", a: "Yes, railings are scrubbed and wiped to remove dust." },
      { q: "What if there is no water connection near the balcony?", a: "Our team will fetch water from the nearest bathroom or kitchen." },
      { q: "Do you clean wall tiles in the balcony?", a: "Yes, wall tiles are wiped down to remove surface dust." },
      { q: "Will you discard old items?", a: "No, we do not throw away trash or scrap items left in the balcony." },
      { q: "How long does it take?", a: "It takes about 30 to 45 minutes." },
      { q: "Do you clean mesh windows?", a: "Yes, window mesh screen dusting is included." }
    ]
  },
  "quick-balcony-above-4ft": {
    tools: [
      "Floor scrubbers",
      "High pressure water sprays",
      "Hard dusting brushes",
      "Mesh cleaning brushes"
    ],
    ready: [
      "Remove plants or outdoor furniture from the balcony",
      "Ensure access to a water connection"
    ],
    reviews: [
      { name: "Aditi G.", rating: "4.8", text: '"Deep scrubbed the entire balcony floor and mesh screens. Perfect."' },
      { name: "Rohan J.", rating: "4.7", text: '"Professional cleaners. Cleaned my large balcony tiles and railings nicely."' }
    ],
    faqs: [
      { q: "Is mesh screen cleaning included?", a: "Yes, mesh screen dusting and washing is included." },
      { q: "Will you clean glass railings?", a: "Yes, both sides of glass railings are cleaned if safely accessible." },
      { q: "Do you clean balcony ceilings?", a: "No, ceiling and roof cleaning is not included." },
      { q: "How much time is required?", a: "It takes around 45 to 60 minutes for balconies above 4ft width." },
      { q: "Do you scrub the floor with a machine?", a: "No, manual heavy-duty scrubbing brushes are used to remove stains." },
      { q: "Are plant pots moved by the cleaners?", a: "We request customers to move heavy plant pots beforehand. Light pots can be moved by our team." },
      { q: "Do you clean outer side of balcony walls?", a: "No, exterior walls are excluded due to safety hazards." },
      { q: "Do you remove hard water stains from tiles?", a: "We use cleaning detergents, but very old hard water scaling might not disappear completely." }
    ]
  },
  "quick-dining-table": {
    tools: [
      "Heavy duty degreasers / polishers",
      "Microfiber detailing cloths",
      "Soft detailing brushes"
    ],
    ready: [
      "Clear all items from the dining table",
      "Ensure access to water and power outlets"
    ],
    reviews: [
      { name: "Rohit P.", rating: "4.9", text: '"Very detailed cleaning of the dining chairs as well. Stains are completely gone!"' },
      { name: "Kunal M.", rating: "4.8", text: '"Cleaned the glass table top spotless. The wooden chairs look polished."' }
    ],
    faqs: [
      { q: "Will this clean the table chairs too?", a: "Yes, this service covers the deep cleaning of both the dining table and the chairs." },
      { q: "Is wood polishing included?", a: "No, we perform standard cleaning and gentle wiping. Wood varnishing or professional polishing is not included." },
      { q: "How many chairs are covered?", a: "Up to a 6-seater dining set is covered in the standard package." },
      { q: "Will you clean table mats?", a: "No, table mats, table cloths, and runners are not cleaned." },
      { q: "Do you clean table extensions?", a: "Yes, if the table extensions are opened by the customer before cleaning." },
      { q: "Will you remove grease stains?", a: "Yes, food oil, grease, and sticky stains are thoroughly cleaned." },
      { q: "Do you clean glass tabletops?", a: "Yes, glass tops are cleaned with specialized glass cleaning spray." },
      { q: "How long does it take?", a: "The dining table and chairs cleaning takes about 30 to 40 minutes." }
    ]
  },
  "fabric-sofa-clean": {
    tools: [
      "Fabric-safe cleaning shampoo",
      "Microfiber cloths",
      "Soft cleaning brushes",
      "Wet & dry vacuum"
    ],
    ready: [
      "Keep the sofa area accessible",
      "Remove personal items from the sofa",
      "Keep nearby furniture and valuables safely away",
      "Provide a power connection"
    ],
    reviews: [
      { name: "Ananya S.", rating: "5.0", text: '"The sofa looks much cleaner and fresh. The team did a neat job."' },
      { name: "Rahul K.", rating: "4.8", text: '"Good cleaning service. They removed most of the dust and stains."' }
    ],
    faqs: [
      { q: "Will you clean the sofa cushions?", a: "Normal sofa seats and back cushions are covered. Separate loose/removable cushions are not included." },
      { q: "Will you remove stains?", a: "We treat common food, dust and everyday stains. Very old or permanent stains may not be completely removable." },
      { q: "Will the sofa be completely dry immediately?", a: "The team removes excess moisture, but some drying time may still be required." },
      { q: "Do I need to provide cleaning products?", a: "No. Our team brings the required cleaning products and equipment." },
      { q: "How long does it take?", a: "Sofa cleaning takes around 1 to 1.5 hours depending on seats." },
      { q: "Do you clean the back side of the sofa?", a: "Yes, all accessible sides (front, back, sides, armrests) are vacuumed and cleaned." },
      { q: "Is leather sofa covered under this?", a: "No, this is specifically for fabric sofas. Leather sofas require a different service." },
      { q: "How often should I get this done?", a: "We recommend professional fabric sofa deep cleaning every 6 months." }
    ]
  },
  "fabric-sofa-cushion-clean": {
    tools: [
      "Fabric-safe cleaning shampoo",
      "Microfiber cloths",
      "Soft cleaning brushes",
      "Wet & dry vacuum"
    ],
    ready: [
      "Keep the sofa and cushions accessible",
      "Remove personal items from the sofa",
      "Keep nearby furniture and valuables safely away",
      "Provide a power connection"
    ],
    reviews: [
      { name: "Priya R.", rating: "5.0", text: '"The sofa and cushions were cleaned really well. Everything looks fresh now."' },
      { name: "Karthik M.", rating: "4.9", text: '"Very good service. They cleaned the sofa and cushions carefully."' }
    ],
    faqs: [
      { q: "Are loose cushions included?", a: "Yes. Loose/removable cushions belonging to the sofa are included." },
      { q: "How many cushions are included?", a: "The cushions that belong to the selected sofa are included. Extra cushions can be added separately if available." },
      { q: "Will you remove all stains?", a: "Common stains will be treated, but very old or permanent stains may not completely disappear." },
      { q: "Can the sofa be used immediately?", a: "Some drying time may be required after cleaning." },
      { q: "Do you use chemical cleaners?", a: "We use fabric-safe, mild professional cleaning shampoos." },
      { q: "Is dry cleaning available?", a: "No, this is a shampoo extraction wet-cleaning process." },
      { q: "Does it help remove pet odors?", a: "Yes, the deep shampooing and wet-vacuuming extracts deep dirt and helps eliminate odors." },
      { q: "What is the typical drying time?", a: "It takes about 3 to 4 hours under a running ceiling fan to dry completely." }
    ]
  },
  "leather-sofa-clean": {
    tools: [
      "Leather-safe cleaning solution",
      "Leather conditioner",
      "Soft microfiber cloths",
      "Soft cleaning brushes"
    ],
    ready: [
      "Keep the sofa area accessible",
      "Remove personal items from the sofa",
      "Keep valuables safely away",
      "Provide a well-ventilated area"
    ],
    reviews: [
      { name: "Ananya S.", rating: "5.0", text: '"The leather sofa looks clean and fresh again. Very neat work."' },
      { name: "Rahul K.", rating: "4.8", text: '"The team handled the leather sofa carefully and professionally."' }
    ],
    faqs: [
      { q: "Will you use shampoo on the leather sofa?", a: "No. We use products specifically suitable for leather surfaces." },
      { q: "Will you remove scratches from the leather?", a: "No. Cleaning cannot repair deep scratches, cuts or damaged leather." },
      { q: "Will you polish the leather sofa?", a: "The sofa receives a leather-safe conditioning and finishing treatment." },
      { q: "Can you clean all types of leather?", a: "We clean commonly used finished leather surfaces. Special or delicate leather may require an additional assessment." },
      { q: "How long does it take?", a: "It takes approximately 1 hour." },
      { q: "Does the leather smell go away?", a: "Yes, the leather-safe cleaners help refresh the leather and reduce odors." },
      { q: "Is loose cushions cleaning included?", a: "Loose leather cushions are not covered unless the cushion package is chosen." },
      { q: "How long after cleaning can we sit?", a: "You can sit on it almost immediately after the conditioner dries (about 15-20 minutes)." }
    ]
  },
  "leather-sofa-cushion-clean": {
    tools: [
      "Leather-safe cleaning solution",
      "Leather conditioner",
      "Soft microfiber cloths",
      "Soft cleaning brushes"
    ],
    ready: [
      "Keep the sofa and cushions accessible",
      "Remove personal items from the sofa",
      "Keep valuables safely away",
      "Provide a well-ventilated area"
    ],
    reviews: [
      { name: "Priya R.", rating: "5.0", text: '"The sofa and cushions were cleaned very carefully. They look much better now."' },
      { name: "Karthik M.", rating: "4.9", text: '"Good service and the leather was handled properly."' }
    ],
    faqs: [
      { q: "Are removable leather cushions included?", a: "Yes. Loose/removable cushions belonging to the sofa are included." },
      { q: "Will you repair damaged leather?", a: "No. Cuts, cracks, peeling and other leather damage are not repairable through this cleaning service." },
      { q: "Will you use water on the leather?", a: "Only suitable amounts are used with leather-safe cleaning products." },
      { q: "Will the leather become shiny after cleaning?", a: "The conditioning and finishing treatment gives the leather a clean and well-maintained appearance." },
      { q: "Do you clean suede leather?", a: "No, we only clean standard finished smooth leather. Suede and nubuck are excluded." },
      { q: "Can I choose this for loose cushions only?", a: "No, this is an add-on package for the entire leather sofa + cushions." },
      { q: "How long does this take?", a: "The detailed cleaning and conditioning takes about 1.5 hours." },
      { q: "How often should leather be conditioned?", a: "We recommend conditioning your leather sofa every 6 to 12 months." }
    ]
  },
  "mattress-deep": {
    tools: [
      "Fabric-safe mattress shampoo",
      "Wet & dry vacuum",
      "Microfiber cloths",
      "Soft cleaning brushes"
    ],
    ready: [
      "Keep the mattress accessible",
      "Remove bedsheets, pillows and blankets",
      "Keep nearby items safely away",
      "Provide a power connection"
    ],
    reviews: [
      { name: "Ananya S.", rating: "5.0", text: '"The mattress had a lot of dust and stains. It looks much cleaner now."' },
      { name: "Rahul K.", rating: "4.8", text: '"Good service and the mattress was cleaned properly."' }
    ],
    faqs: [
      { q: "Will you clean the entire mattress?", a: "Yes, all accessible sides and surfaces included in the selected service will be cleaned." },
      { q: "Will you remove all stains?", a: "Common stains will be treated, but very old or permanent stains may not completely disappear." },
      { q: "Can I use the mattress immediately after cleaning?", a: "Some drying time is required before using the mattress." },
      { q: "Do I need to remove the bedsheets?", a: "Yes, please remove bedsheets, blankets and other items before the service." },
      { q: "How long does it take?", a: "It takes about 1 hour per mattress." },
      { q: "Do you sanitize the mattress?", a: "Yes, deep cleaning shampoo has mild sanitizing properties to remove germs." },
      { q: "Will you clean both top and bottom sides?", a: "Yes, standard deep cleaning covers both main sides of the mattress." },
      { q: "Is urine stain removal guaranteed?", a: "We treat it with deodorizer and cleaning solution, but complete stain removal depends on stain age." }
    ]
  },
  "mattress-pillow-refresh": {
    tools: [
      "Fabric-safe cleaning products",
      "Wet & dry vacuum",
      "Microfiber cloths",
      "Soft cleaning brushes"
    ],
    ready: [
      "Remove bedsheets and covers",
      "Keep mattress and pillows accessible",
      "Clear the surrounding area",
      "Provide a power connection"
    ],
    reviews: [
      { name: "Priya R.", rating: "5.0", text: '"The mattress and pillows were cleaned very neatly. Good service."' },
      { name: "Karthik M.", rating: "4.9", text: '"Everything was handled carefully and the mattress feels much fresher."' }
    ],
    faqs: [
      { q: "Are pillows included?", a: "Yes, pillows are included in this package." },
      { q: "How many pillows are included?", a: "Up to 2 standard pillows are included." },
      { q: "Will you remove difficult stains?", a: "We treat common stains, but permanent stains may not be completely removable." },
      { q: "How long does the mattress take to dry?", a: "Drying time depends on room ventilation, usually takes a few hours." },
      { q: "Do you clean the pillow covers too?", a: "No, we request you to wash pillow covers separately." },
      { q: "Can you clean extra pillows?", a: "Yes, additional pillows can be added for a small extra charge." },
      { q: "Do you use steam?", a: "No, we use deep vacuuming and mild foam sanitization." },
      { q: "Does this eliminate dust mites?", a: "Yes, high-power vacuuming removes dust mites and allergens from the mattress and pillows." }
    ]
  },
  "carpet-deep": {
    tools: [
      "Carpet shampoo",
      "Wet & dry vacuum",
      "Microfiber cloths",
      "Sponge scrubbers"
    ],
    ready: [
      "Keep the carpet area accessible",
      "Clear any furniture on top of the carpet",
      "Provide a power connection"
    ],
    reviews: [
      { name: "Priya R.", rating: "5.0", text: '"The carpet looks extremely clean and the dirt was extracted nicely."' },
      { name: "Karthik M.", rating: "4.8", text: '"Good shampoo cleaning and quick drying. Professional team."' }
    ],
    faqs: [
      { q: "Will you remove all stains from the carpet?", a: "We treat common food and dirt stains. Very old or permanent stains may not be completely removable." },
      { q: "How long will the carpet take to dry?", a: "Drying time depends on the carpet thickness and room ventilation, usually takes a few hours." },
      { q: "Do I need to clear furniture before cleaning?", a: "Yes, please remove tables, chairs, and other items from the carpet before the service." },
      { q: "Do you clean handmade/delicate silk carpets?", a: "No, we only clean standard synthetic, wool, and cotton carpets. Silk carpets require dry-cleaning." },
      { q: "How long does it take?", a: "It takes about 1 hour for standard sized carpets." },
      { q: "Do you scrub the carpet with a machine?", a: "Yes, hand-held scrubbing brushes or rotating cleaning pads are used depending on type." },
      { q: "Will it remove pet odors?", a: "Yes, carpet shampooing helps extract dust, stains and removes pet odors." },
      { q: "Can it shrink the carpet?", a: "No, our cleaning process and carpet shampoos prevent shrinking." }
    ]
  }
};

export function SofaCleaningModal({ category, cart, setCart, onClose, onCheckout }) {
  const [activeTab, setActiveTab] = useState("sofa");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedServiceDetails, setSelectedServiceDetails] = useState(null);
  const [activeFaq, setActiveFaq] = useState(null);
  const [dbPackages, setDbPackages] = useState([]);

  useEffect(() => {
    const fetchPackages = async () => {
      try {
        const res = await apiRequest("/settings/catalog/public/packages/?service_slug=sofa-cleaning");
        if (res.success && Array.isArray(res.data)) {
          setDbPackages(res.data);
        }
      } catch (err) {
        console.error("Failed to fetch sofa packages:", err);
      }
    };
    fetchPackages();
  }, []);

  useEffect(() => {
    if (selectedServiceDetails) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedServiceDetails]);

  const addItemToCart = (id, name, price, duration) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === id);
      if (existing) return prev.map(i => i.id === id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { id, name, price, duration, quantity: 1 }];
    });
  };

  const removeItemFromCart = (id) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === id);
      if (!existing) return prev;
      if (existing.quantity === 1) return prev.filter(i => i.id !== id);
      return prev.map(i => i.id === id ? { ...i, quantity: i.quantity - 1 } : i);
    });
  };

  const getCount = (id) => cart.find(i => i.id === id)?.quantity || 0;

  const getDynamicServices = () => {
    let list = activeTab === "sofa" ? SOFA_CLEANING_SERVICES : activeTab === "mattress" ? MATTRESS_SERVICES : activeTab === "carpet" ? CARPET_SERVICES : SOFA_ADDONS_SERVICES;
    list = JSON.parse(JSON.stringify(list));

    if (dbPackages.length > 0) {
      list = list.map(item => {
        if (Array.isArray(item.subOptions)) {
          const parentDbMatch = dbPackages.find(p => p.slug === (item.id === "fridge-clean" ? "fridge-parent" : item.id === "stove-clean" ? "stove-parent" : item.id));
          if (parentDbMatch) {
            item.name = parentDbMatch.name;
            item.price = Math.round(Number(parentDbMatch.base_price) || item.price);
            item.duration = parentDbMatch.duration || item.duration;
            item.description = parentDbMatch.description || item.description;
            item.includes = Array.isArray(parentDbMatch.includes) ? parentDbMatch.includes : item.includes;
            if (Array.isArray(parentDbMatch.tools) && parentDbMatch.tools.length > 0) item.tools = parentDbMatch.tools;
            if (Array.isArray(parentDbMatch.ready) && parentDbMatch.ready.length > 0) item.ready = parentDbMatch.ready;
            if (Array.isArray(parentDbMatch.reviews) && parentDbMatch.reviews.length > 0) item.reviews = parentDbMatch.reviews;
            if (Array.isArray(parentDbMatch.faqs) && parentDbMatch.faqs.length > 0) item.faqs = parentDbMatch.faqs;
          }

          item.subOptions = item.subOptions.map(subOpt => {
            const dbMatch = dbPackages.find(p => p.slug === subOpt.id);
            if (dbMatch) {
              const updatedSub = {
                ...subOpt,
                name: dbMatch.name,
                price: Math.round(Number(dbMatch.base_price) || subOpt.price),
                duration: dbMatch.duration || subOpt.duration,
                includes: Array.isArray(dbMatch.includes) ? dbMatch.includes : subOpt.includes,
              };
              if (Array.isArray(dbMatch.tools) && dbMatch.tools.length > 0) updatedSub.tools = dbMatch.tools;
              if (Array.isArray(dbMatch.ready) && dbMatch.ready.length > 0) updatedSub.ready = dbMatch.ready;
              if (Array.isArray(dbMatch.reviews) && dbMatch.reviews.length > 0) updatedSub.reviews = dbMatch.reviews;
              if (Array.isArray(dbMatch.faqs) && dbMatch.faqs.length > 0) updatedSub.faqs = dbMatch.faqs;
              return updatedSub;
            }
            return subOpt;
          });
          if (item.subOptions.length > 0) {
            item.price = item.subOptions[0].price;
          }
        } else {
          const dbMatch = dbPackages.find(p => p.slug === item.id);
          if (dbMatch) {
            item.name = dbMatch.name;
            item.price = Math.round(Number(dbMatch.base_price) || item.price);
            item.duration = dbMatch.duration || item.duration;
            item.description = dbMatch.description || item.description;
            item.includes = Array.isArray(dbMatch.includes) ? dbMatch.includes : item.includes;
            if (Array.isArray(dbMatch.tools) && dbMatch.tools.length > 0) item.tools = dbMatch.tools;
            if (Array.isArray(dbMatch.ready) && dbMatch.ready.length > 0) item.ready = dbMatch.ready;
            if (Array.isArray(dbMatch.reviews) && dbMatch.reviews.length > 0) item.reviews = dbMatch.reviews;
            if (Array.isArray(dbMatch.faqs) && dbMatch.faqs.length > 0) item.faqs = dbMatch.faqs;
          }
        }
        return item;
      });
    }
    return list;
  };

  const currentServicesList = getDynamicServices();

  const activeServices = currentServicesList.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.includes.some(inc => inc.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <div className="w-full text-slate-700 bg-white">
      {/* Sticky Header + Tabs */}
      <div className="sticky top-16 z-20 bg-white pb-2 shadow-sm">
        <div className="p-0 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50/80 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 font-bold text-xs transition-all cursor-pointer shadow-xs active:scale-95"
            >
              <ChevronLeft size={14} /> Back to Services
            </button>
            <h2 className="text-xl font-black text-slate-900">Sofa Cleaning</h2>
          </div>
        </div>
        <div className="flex gap-5 pb-3 pt-2 border-b border-slate-100 justify-start">
          {SOFA_SUB_TABS.map(tab => {
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setSearchQuery(""); }}
                className="flex flex-col items-center justify-start p-1.5 transition-all cursor-pointer text-center bg-transparent w-[90px] shrink-0"
              >
                <img
                  src={tab.image}
                  alt={tab.name}
                  className={`w-14 h-14 object-cover rounded-xl mb-1.5 transition-all duration-200 ${isSelected ? "scale-[1.05] shadow-md" : "opacity-80 hover:opacity-100"
                    }`}
                />
                <span className={`text-[10px] block leading-tight tracking-tight mt-0.5 transition-colors ${isSelected ? "text-slate-800 font-extrabold" : "text-slate-600 font-bold"
                  }`}>
                  {tab.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row flex-1 pt-4">

        {/* Left Column */}
        <div className="flex-1 space-y-5 lg:pr-6">

          {/* Section title */}
          <div className="pt-1">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
              <div className="w-1.5 h-3.5 bg-emerald-600 rounded-full" />
              {activeTab === "sofa" ? "Sofa Cleaning" : activeTab === "mattress" ? "Mattress Cleaning" : "Carpet Cleaning"}
            </h3>
          </div>

          <div className="space-y-4">
            {activeServices.map((service, idx) => {
              const count = getCount(service.id);
              const isFirst = idx === 0 && !searchQuery;
              return (
                <div key={service.id} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-all">
                  {/* First item image hero */}
                  {isFirst && (
                    <div className="w-full h-56 sm:h-60 bg-slate-100 rounded-2xl overflow-hidden mb-4">
                      <img
                        src={activeTab === "sofa" ? "/mockups/sofa_top_new.png" : activeTab === "mattress" ? "/mockups/mattress_header_new.png" : "/mockups/carpet_top_new.png"}
                        alt={service.name}
                        className="w-full h-full object-cover object-top"
                      />
                    </div>
                  )}

                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <h4 className="font-extrabold text-slate-900 text-sm md:text-base mb-1.5">{service.name}</h4>

                      {service.description && (
                        <p className="text-xs text-slate-500 leading-relaxed max-w-xl mb-2">{service.description}</p>
                      )}

                      <div className="flex items-center gap-3 text-xs pt-1 mb-3">
                        <span className="text-base font-black text-slate-900">
                          {service.options ? `Starts at ₹${service.price}` : `₹${service.price}`}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="text-slate-500 font-semibold">{service.duration}</span>
                      </div>

                      {service.includes && service.includes.length > 0 && (
                        <ul className="text-xs text-slate-600 space-y-1 bg-slate-50/50 p-3.5 rounded-xl border border-slate-100 mb-4">
                          {service.includes.map((item, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-emerald-600 font-bold mt-0.5">✓</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      <button 
                        onClick={() => setSelectedServiceDetails(service)}
                        className="text-xs font-semibold text-blue-600 mt-2 hover:underline bg-transparent border-0 cursor-pointer"
                      >
                        View details
                      </button>
                    </div>

                    {/* Image + add button */}
                    <div className="relative shrink-0 w-28 pb-9 flex flex-col items-center">
                      <div className="w-28 h-24 rounded-2xl overflow-hidden bg-slate-100 border border-slate-100 flex items-center justify-center">
                        <img src={service.image} alt={service.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 w-20 z-10">
                        {count > 0 ? (
                          <div className="flex items-center justify-between bg-white border border-emerald-500 rounded-lg px-2 py-1 text-xs font-bold text-emerald-700 shadow-md">
                            <button onClick={() => removeItemFromCart(service.id)} className="hover:text-emerald-900">-</button>
                            <span>{count}</span>
                            <button onClick={() => addItemToCart(service.id, service.name, service.price, service.duration)} className="hover:text-emerald-900">+</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              if (service.subOptions) {
                                setSelectedServiceDetails(service);
                              } else {
                                addItemToCart(service.id, service.name, service.price, service.duration);
                              }
                            }}
                            className="w-full bg-white border border-slate-200 text-emerald-600 font-extrabold text-[11px] py-1.5 rounded-lg hover:bg-slate-50 transition-all shadow-md flex items-center justify-center gap-1 uppercase cursor-pointer"
                          >
                            <ShoppingCart size={12} /> Add
                          </button>
                        )}
                      </div>
                      {service.options && (
                        <p className="absolute bottom-0 text-[10px] text-slate-400 text-center font-bold tracking-tight w-full">{service.options}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Order Summary */}
        <div className="w-full lg:w-[350px] bg-slate-50 border-t lg:border-t-0 lg:border-l border-slate-100 p-5 flex flex-col justify-between lg:sticky lg:top-32 h-fit space-y-4 mt-6 lg:mt-0 rounded-2xl">
          <div className="space-y-4">
            <div className="bg-white border border-slate-200/60 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="border-b border-slate-100 pb-2 flex justify-between items-center">
                <h5 className="font-extrabold text-xs text-slate-800 uppercase tracking-wide">Order Summary</h5>
                <span className="text-[10px] font-bold text-slate-400">{cart.length} items</span>
              </div>

              {cart.length > 0 ? (
                <div className="space-y-3 max-h-[160px] overflow-y-auto pr-1 scrollbar-thin">
                  {cart.map(item => (
                    <div key={item.id} className="flex justify-between items-start text-xs gap-2">
                      <div className="flex-1">
                        <span className="font-bold text-slate-800 block leading-tight">{item.name}</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">{item.duration}</span>
                      </div>
                      <div className="text-right flex items-center gap-2">
                        <span className="font-extrabold text-slate-900">₹{(item.price * item.quantity).toLocaleString("en-IN")}</span>
                        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-[10px] font-bold">
                          <button onClick={() => removeItemFromCart(item.id)} className="hover:text-emerald-600">-</button>
                          <span>{item.quantity}</span>
                          <button onClick={() => addItemToCart(item.id, item.name, item.price, item.duration)} className="hover:text-emerald-600">+</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-slate-400 text-xs">
                  No services added. Select from the left.
                </div>
              )}

              <div className="border-t border-slate-100 pt-2.5 space-y-1.5 text-xs">
                {cart.length > 0 && (
                  <div className="flex justify-between text-slate-500">
                    <span>Items Subtotal</span>
                    <span>₹{subtotal.toLocaleString("en-IN")}</span>
                  </div>
                )}
                <div className="flex justify-between font-extrabold text-slate-900 text-sm border-t border-dashed border-slate-200 pt-2">
                  <span>Total Amount</span>
                  <span>₹{subtotal.toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-200/60">
            <button
              disabled={cart.length === 0}
              onClick={onCheckout}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-extrabold rounded-2xl text-center text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all"
            >
              Proceed to Schedule
            </button>
          </div>
        </div>
      </div>

      <AppBannerAndFooter />

      {/* Details modal overlay */}
      {selectedServiceDetails && createPortal(
        <div 
          onClick={() => setSelectedServiceDetails(null)}
          className="fixed inset-0 z-[250] bg-black/45 flex items-center justify-center p-4"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden shadow-2xl relative font-sans"
          >
            {/* Close button */}
            <button 
              onClick={() => setSelectedServiceDetails(null)} 
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-800 bg-white/80 hover:bg-white p-1.5 rounded-full z-30 shadow-md transition-colors border-none"
            >
              <X size={16} />
            </button>

            {/* Header: full width hero image */}
            <div className="w-full h-36 border-b border-slate-100 shrink-0 bg-slate-100">
              <img 
                src={selectedServiceDetails.image} 
                alt={selectedServiceDetails.name} 
                className="w-full h-full object-cover"
              />
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
              {/* Title, rating and add wrap */}
              <div className="border-b border-slate-100 pb-5">
                <h3 className="text-base font-extrabold text-slate-900 mb-1">{selectedServiceDetails.name}</h3>
                
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold mb-4">
                  <Star className="text-[#7C3AED] fill-[#7C3AED]" size={12} />
                  <span className="text-slate-800">4.82</span>
                  <span className="text-slate-400 font-normal underline">(4.5M reviews)</span>
                </div>

                {!selectedServiceDetails.subOptions ? (
                  <div className="flex items-center justify-between bg-slate-50 border border-slate-100/80 rounded-2xl p-4">
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Price</div>
                      <div className="text-base font-black text-slate-900 mt-0.5">
                        ₹{selectedServiceDetails.price}
                        <span className="text-slate-400 text-xs font-normal ml-2">• {selectedServiceDetails.duration}</span>
                      </div>
                    </div>

                    <div className="w-24">
                      {getCount(selectedServiceDetails.id) > 0 ? (
                        <div className="flex items-center justify-between bg-white border border-emerald-500 rounded-lg px-2 py-1.5 text-xs font-bold text-emerald-700 shadow-md">
                          <button onClick={() => removeItemFromCart(selectedServiceDetails.id)} className="hover:text-emerald-900">-</button>
                          <span>{getCount(selectedServiceDetails.id)}</span>
                          <button onClick={() => addItemToCart(selectedServiceDetails.id, selectedServiceDetails.name, selectedServiceDetails.price, selectedServiceDetails.duration)} className="hover:text-emerald-900">+</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addItemToCart(selectedServiceDetails.id, selectedServiceDetails.name, selectedServiceDetails.price, selectedServiceDetails.duration)}
                          className="w-full bg-white border border-slate-200 text-emerald-600 font-extrabold text-xs py-2 rounded-lg hover:bg-slate-50 transition-all shadow-md uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer border-none"
                        >
                          <ShoppingCart size={13} /> Add
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-slate-100/80 rounded-2xl p-4 text-center">
                    <span className="text-xs font-bold text-slate-500">Please select an option below</span>
                  </div>
                )}
              </div>


                            {/* Sub-options selector */}
              {selectedServiceDetails.subOptions && (
                <div className="space-y-4 border-t border-slate-100 pt-5 text-left">
                  <h4 className="text-xs font-black text-slate-850 uppercase tracking-wider mb-3">Choose Variant</h4>
                  <div className="grid grid-cols-3 gap-3">
                    {selectedServiceDetails.subOptions.map(sub => {
                      const subCount = getCount(sub.id);
                      return (
                        <div key={sub.id} className="border border-slate-200/80 rounded-2xl p-2.5 flex flex-col justify-between items-center text-center bg-slate-50/20 hover:border-slate-300 transition-all">
                          <div className="w-full aspect-[4/3] rounded-xl overflow-hidden bg-slate-100 mb-2 flex items-center justify-center">
                            <img src={sub.image} alt={sub.name} className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-1 flex flex-col justify-between w-full">
                            <div>
                              <h5 className="text-[11px] font-extrabold text-slate-900 leading-tight mb-1.5">{sub.name}</h5>
                            </div>
                            <div className="w-full mt-auto">
                              <div className="text-xs font-black text-slate-900 mb-2">₹{sub.price}</div>
                              {subCount > 0 ? (
                                <div className="flex items-center justify-between bg-white border border-emerald-500 rounded-lg px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 shadow-sm w-full">
                                  <button onClick={() => removeItemFromCart(sub.id)} className="hover:text-emerald-900">-</button>
                                  <span>{subCount}</span>
                                  <button onClick={() => addItemToCart(sub.id, sub.name, sub.price, sub.duration)} className="hover:text-emerald-900">+</button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => addItemToCart(sub.id, sub.name, sub.price, sub.duration)}
                                  className="w-full bg-white border border-slate-200 text-emerald-600 font-extrabold text-[10px] py-1 rounded-lg hover:bg-slate-50 transition-all shadow-sm uppercase flex items-center justify-center gap-0.5"
                                >
                                  Add
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tools & Products We Use */}
              {(() => {
                const id = selectedServiceDetails.id;
                const tools = Array.isArray(selectedServiceDetails.tools)
                  ? selectedServiceDetails.tools
                  : (SOFA_DETAIL_DATA[id]?.tools || []);
                if (tools.length === 0) return null;
                return (
                  <div className="space-y-2.5 border-t border-slate-100 pt-5 text-left">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">Tools & Products We Use</h4>
                    <div className="space-y-2">
                      {tools.map((item, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-slate-600">
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                          <span className="leading-relaxed">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* What You Need to Keep Ready */}
              {(() => {
                const id = selectedServiceDetails.id;
                const readyList = Array.isArray(selectedServiceDetails.ready)
                  ? selectedServiceDetails.ready
                  : (SOFA_DETAIL_DATA[id]?.ready || []);
                if (readyList.length === 0) return null;
                return (
                  <div className="space-y-2.5 border-t border-slate-100 pt-5 text-left">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">What You Need to Keep Ready</h4>
                    <div className="space-y-2">
                      {readyList.map((item, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-slate-600">
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                          <span className="leading-relaxed">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Customer Reviews */}
              <div className="space-y-2.5 border-t border-slate-100 pt-5 text-left">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">Customer Reviews</h4>
                {(() => {
                  const id = selectedServiceDetails.id;
                  const reviews = Array.isArray(selectedServiceDetails.reviews)
                    ? selectedServiceDetails.reviews
                    : (SOFA_DETAIL_DATA[id]?.reviews || []);
                  return reviews.map((rev, idx) => (
                    <div key={idx} className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-1.5 mb-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-800">{rev.name}</span>
                        <div className="flex items-center gap-1 text-[10px] font-extrabold text-[#7C3AED]">
                          <Star className="fill-[#7C3AED] text-[#7C3AED]" size={12} />
                          <span>{rev.rating}</span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed italic">
                        {rev.text}
                      </p>
                    </div>
                  ));
                })()}
              </div>

              {/* Frequently Asked Questions */}
              <div className="space-y-2.5 border-t border-slate-100 pt-5 text-left">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">Frequently Asked Questions</h4>
                <div className="space-y-2">
                  {(() => {
                    const id = selectedServiceDetails.id;
                    const faqs = Array.isArray(selectedServiceDetails.faqs)
                      ? selectedServiceDetails.faqs
                      : (SOFA_DETAIL_DATA[id]?.faqs || []);
                    return faqs.map((faq, idx) => {
                      const isFaqOpen = activeFaq === idx;
                      return (
                        <div key={idx} className="border border-slate-100 rounded-xl overflow-hidden bg-white shadow-sm transition-all duration-200">
                          <button
                            onClick={() => setActiveFaq(isFaqOpen ? null : idx)}
                            className="w-full p-3 flex justify-between items-center text-xs bg-white font-semibold text-left cursor-pointer hover:bg-slate-50/50 border-none"
                          >
                            <span className={isFaqOpen ? "text-emerald-600 font-bold" : "text-slate-700"}>{faq.q}</span>
                            <span className={isFaqOpen ? "text-emerald-600 text-sm font-bold ml-2 shrink-0" : "text-slate-400 text-sm font-bold ml-2 shrink-0"}>{isFaqOpen ? "−" : "+"}</span>
                          </button>
                          {isFaqOpen && (
                            <div className="px-3 pb-3 pt-1 text-xs text-slate-500 leading-relaxed border-t border-slate-50 bg-slate-50/20">
                              {faq.a}
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>

            {/* Sticky Footer with teal proceed button */}
            <div className="border-t border-slate-100 p-4 bg-slate-50 flex items-center justify-between shrink-0">
              {(() => {
                if (selectedServiceDetails.subOptions) {
                  const subTotalVal = selectedServiceDetails.subOptions.reduce((acc, sub) => {
                    return acc + (sub.price * getCount(sub.id));
                  }, 0);
                  return subTotalVal > 0 ? (
                    <div className="text-sm font-extrabold text-slate-900">₹{subTotalVal}</div>
                  ) : (
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{selectedServiceDetails.name}</div>
                  );
                }
                return (
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{selectedServiceDetails.name}</div>
                );
              })()}
              <button
                onClick={() => {
                  if (!selectedServiceDetails.subOptions) {
                    if (getCount(selectedServiceDetails.id) === 0) {
                      addItemToCart(selectedServiceDetails.id, selectedServiceDetails.name, selectedServiceDetails.price, selectedServiceDetails.duration);
                    }
                  }
                  setSelectedServiceDetails(null);
                }}
                className="bg-[#54B6A6] hover:bg-[#43a192] text-white font-extrabold text-xs py-2.5 px-6 rounded-lg shadow-md transition-all uppercase tracking-wider cursor-pointer border-none"
              >
                Proceed
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
