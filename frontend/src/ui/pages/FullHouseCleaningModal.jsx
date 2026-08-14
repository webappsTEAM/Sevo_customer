import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, Search, ShoppingCart, Star, Check, X } from "lucide-react";

const BOOKING_CURRENCY_SYMBOL = "₹";

const FULL_HOUSE_SUB_TABS = [
  { id: "full_apartment", name: "Occupied Apartment", image: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=150&q=80&fit=crop" },
  { id: "unoccupied_apartment", name: "Unoccupied Apartment", image: "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=150&q=80&fit=crop" },
  { id: "full_bungalow", name: "Occupied Bungalow/duplex", image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=150&q=80&fit=crop" },
  { id: "unoccupied_bungalow", name: "Unoccupied Bungalow/duplex", image: "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=150&q=80&fit=crop" },
  { id: "partial_home", name: "quick extra service", image: "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=150&q=80&fit=crop" }
];

const FULL_HOUSE_SERVICES = {
  unoccupied_apartment: [
    {
      id: "unfurnished-apt-deep",
      name: "Unoccupied apartment",
      description: "Deep cleaning of empty/unfurnished apartment before moving in or after moving out.",
      rating: "4.81",
      reviews: "1.7M bookings",
      price: 3139,
      duration: "3 hrs",
      image: "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=300&q=80&fit=crop",
      includes: [
        "Scrubbing of floors, wall tiles, windows and balcony",
        "Deep clean of empty kitchen cabinets & closets",
        "Thorough sanitization of bathrooms & fixtures"
      ]
    }
  ],
  full_apartment: [
    {
      id: "classic-apt-deep",
      name: "Classic",
      description: "Bathroom & kitchen deep cleaning, floor cleaning, cobweb removal, dusting & wiping.",
      rating: "4.81",
      reviews: "1.7M bookings",
      price: 3409,
      duration: "4 hrs",
      image: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=300&q=80&fit=crop",
      includes: [
        "Intensive stain removal and deep sanitization of bathrooms & kitchen spaces",
        "Advanced floor machine scrubbing, window panels, and glass cleaning",
        "Thorough dusting of hard-to-reach ceiling areas, fans, and light fixtures",
        "Balcony washdown and exterior furniture dusting with micro-fiber wipes"
      ]
    },
    {
      id: "gold-apt-deep",
      name: "Gold",
      description: "Includes Classic plan + interior cabinet cleaning and interior utensils cupboard.",
      rating: "4.85",
      reviews: "2.1M bookings",
      price: 3759,
      duration: "4 hrs",
      image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=300&q=80&fit=crop",
      includes: [
        "All standard features included in the Classic packages",
        "Deep cleaning of wardrobes and drawers (interior & exterior, if empty)",
        "Utensils removal, cabinet sanitization, and organized rearrangement"
      ]
    },
    {
      id: "diamond-apt-deep",
      name: "Diamond",
      description: "Includes Gold plan + sofa, carpet & mattress shampoo wash.",
      rating: "4.91",
      reviews: "950K bookings",
      price: 4579,
      duration: "4 hrs 30 mins",
      image: "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=300&q=80&fit=crop",
      includes: [
        "All premium inclusions of the Gold deep-cleaning package",
        "Full wet shampooing and extraction wash of sofas and mattresses"
      ]
    }
  ],
  unoccupied_bungalow: [
    {
      id: "unoccupied-bungalow-deep",
      name: "Unoccupied bungalow",
      description: "Thorough deep cleaning of empty/unfurnished independent bungalow or villa.",
      rating: "4.81",
      reviews: "1.7M bookings",
      price: 4419,
      duration: "5 hrs",
      image: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=300&q=80&fit=crop",
      includes: [
        "Machine floor scrubbing, windows, doors & balconies clean",
        "Deep clean of all empty cabinets & closets",
        "Thorough sanitization of bathrooms & fixtures"
      ]
    }
  ],
  full_bungalow: [
    {
      id: "classic-bungalow-deep",
      name: "Classic",
      description: "Bungalow-scale deep sanitation of bathrooms, kitchen, hallways, grilles, and fans.",
      rating: "4.81",
      reviews: "1.7M bookings",
      price: 4439,
      duration: "5 hrs",
      image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=300&q=80&fit=crop",
      includes: [
        "Bungalow-scale deep sanitation of all bathrooms, toilets and kitchen areas",
        "Heavy-duty floor machine scrubbing for staircases, hallways and balconies",
        "Complete ceiling dusting, cobweb removal, and fan/lighting wash",
        "Comprehensive exterior glass panel, grille, and window frame washing"
      ]
    },
    {
      id: "gold-bungalow-deep",
      name: "Gold",
      description: "Includes Classic bungalow plan + cupboard interior cleaning & utensil layout arrangement.",
      rating: "4.85",
      reviews: "2.1M bookings",
      price: 6729,
      duration: "5 hrs 30 mins",
      image: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=300&q=80&fit=crop",
      includes: [
        "All package features included in the Classic bungalow plan",
        "Multi-level cupboard interior cleaning & polishing (if empty)",
        "Kitchen drawer utensil removal, sanitizing and organized layout"
      ]
    },
    {
      id: "diamond-bungalow-deep",
      name: "Diamond",
      description: "Includes Gold bungalow plan + sofa & mattress wet shampoo wash and facade wall wash.",
      rating: "4.91",
      reviews: "950K bookings",
      price: 8729,
      duration: "6 hrs",
      image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=300&q=80&fit=crop",
      includes: [
        "All premium package features included in the Gold bungalow plan",
        "Eco-friendly wet shampoo wash of sofas and master bed mattresses",
        "High-pressure wash of stairs, patio floors and outer facade walls"
      ]
    }
  ],
  partial_home: [
    {
      id: "balcony-clean-under-4",
      name: "Balcony Cleaning: Upto 4 ft Width",
      description: "Thorough floor scrubbing, railing wipe and drainage cleaning for smaller balconies.",
      rating: "4.81",
      reviews: "1.7M bookings",
      price: 399,
      duration: "30 mins",
      image: "https://images.unsplash.com/photo-1595515106969-1ce29566ff1c?w=300&q=80&fit=crop",
      includes: [
        "Complete balcony floor scrubbing & wet mopping",
        "Dusting and wet wiping of balcony railings & grilles"
      ]
    },
    {
      id: "balcony-clean-above-4",
      name: "Balcony Cleaning: Above 4 ft Width",
      description: "Intensive floor scrubbing, glass partition wipe and railing cleaning for spacious balconies.",
      rating: "4.81",
      reviews: "1.7M bookings",
      price: 549,
      duration: "45 mins",
      image: "https://images.unsplash.com/photo-1595515106969-1ce29566ff1c?w=300&q=80&fit=crop",
      includes: [
        "Heavy scrubbing of tiled/concrete balcony floor surfaces",
        "Polishing of glass balustrades & frame borders"
      ]
    },
    {
      id: "window-clean-under-4",
      name: "Window Cleaning (Upto 4 Ft X 4 Ft)",
      description: "Streak-free glass cleaning, sliding track vacuuming and frame wipe for standard windows.",
      rating: "4.81",
      reviews: "1.7M bookings",
      price: 399,
      duration: "30 mins",
      image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=300&q=80&fit=crop",
      includes: [
        "Glass panel cleaning inside and outside",
        "Deep vacuuming of dirt and mud from sliding tracks"
      ]
    },
    {
      id: "window-clean-above-4",
      name: "Window Cleaning (Above 4 Ft X 4 Ft)",
      description: "Detailed washing of large window panes, tracks cleaning and grille wiping.",
      rating: "4.81",
      reviews: "1.7M bookings",
      price: 449,
      duration: "1 hr",
      image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=300&q=80&fit=crop",
      includes: [
        "Thorough cleaning of wide glass windows and frames",
        "Removal of sticky dust from grilles & meshes"
      ]
    },
    {
      id: "dining-table-clean",
      name: "Dining Table Cleaning",
      description: "Intensive sanitization of table surfaces, legs wiping and matching dining chairs cleaning.",
      rating: "4.81",
      reviews: "1.7M bookings",
      price: 449,
      duration: "30 mins",
      image: "https://images.unsplash.com/photo-1517825738774-7de9363ef735?w=300&q=80&fit=crop",
      includes: [
        "Polishing and sanitizing of wooden/glass tabletop",
        "Wiping and dust clearance of up to 6 dining chairs"
      ]
    },
    {
      id: "microwave-clean",
      name: "Microwave Cleaning",
      description: "Deep food-grease removal, interior stain scrubbing and exterior sanitization.",
      rating: "4.81",
      reviews: "1.7M bookings",
      price: 199,
      duration: "15 mins",
      image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=300&q=80&fit=crop",
      includes: [
        "Internal cavity degreasing and splash stain removal",
        "Glass door cleaning and control panel sanitization"
      ]
    }
  ]
};

const HOUSE_DETAILS_CONTENT = {
  "classic-apt-deep": {
    covered: [
      "Bathroom & kitchen deep cleaning",
      "Machine cleaning of floors, doors & windows",
      "Cobweb removal, ceiling & fan dusting",
      "Balcony & utility area cleaning",
      "Cabinet & furniture exterior dusting & wet wiping"
    ],
    tools: [
      "Floor scrubbing & polishing machine",
      "Wet & dry vacuum cleaner",
      "Eco-friendly bathroom & kitchen cleaners",
      "Glass cleaning kits",
      "Scrubbing brushes & microfiber cloths"
    ],
    ready: [
      "Keep all cupboards and drawers empty",
      "Ensure continuous water and power supply"
    ],
    faqs: [
      { q: "How long does it take?", a: "It typically takes 3-4 hours depending on the BHK size and level of dust." },
      { q: "Do you clean inside cabinets and wardrobes?", a: "In the Classic plan, we only clean the exteriors of cabinets, shelves, and wardrobes." },
      { q: "Do I need to be present during the service?", a: "It is recommended to be present at the start and end of the service to verify the requirements and check the results." },
      { q: "What equipment and chemicals do you use?", a: "We use professional-grade single-disc scrubbing machines, wet/dry vacuum cleaners, and eco-friendly biodegradable chemicals." },
      { q: "Are balcony and utility area cleaning included?", a: "Yes, floor scrubbing and washing of balconies and utility areas are included." },
      { q: "Do you clean ceiling fans and light fixtures?", a: "Yes, we wipe and dust all ceiling fans, exhaust fans, and light fixtures." },
      { q: "Does this service remove hard water stains from tiles?", a: "Yes, we scrub tiles and grout to remove hard water stains, though very old scaling may need multiple sessions." },
      { q: "Is wall washing included?", a: "Wall washing is not included. We perform dry dusting of walls and cobweb removal." }
    ],
    apartmentSizes: [
      { label: "1 BHK", price: 3409 },
      { label: "2 BHK", price: 4409 },
      { label: "3 BHK", price: 5409 },
      { label: "4 BHK", price: 6409 },
      { label: "5 BHK", price: 7409 }
    ]
  },
  "gold-apt-deep": {
    covered: [
      "Includes everything in Classic Plan",
      "Cupboard cleaning (interior + exterior, if empty)",
      "Cabinets interior with utensil removal"
    ],
    tools: [
      "Floor scrubbing & polishing machine",
      "Wet & dry vacuum cleaner",
      "Eco-friendly bathroom & kitchen cleaners",
      "Glass cleaning kits",
      "Scrubbing brushes & microfiber cloths"
    ],
    ready: [
      "Keep cupboards empty for interior clean"
    ],
    faqs: [
      { q: "How does the Gold plan differ from the Classic plan?", a: "The Gold plan includes everything in Classic plus complete interior cleaning of empty wardrobes, cabinets, and kitchen cupboards." },
      { q: "Do you remove utensils for kitchen cabinet cleaning?", a: "Yes, our team will carefully remove utensils, clean the shelves' interior, sanitize, and rearrange them back." },
      { q: "Should cupboards be empty before the team arrives?", a: "For wardrobe interior cleaning, keeping them empty helps us work faster. If not, we will clean available open spaces." },
      { q: "How many cleaners are sent for a Gold service?", a: "Typically, a team of 2 to 3 trained professionals is assigned depending on the BHK size." },
      { q: "Do you clean chimneys and kitchen hobs?", a: "We wipe chimney exteriors and hob tops. Internal chimney deep cleaning can be added as an extra service." },
      { q: "Is glass and window cleaning covered?", a: "Yes, we clean window panes, frames, tracks, and mosquito meshes thoroughly." },
      { q: "How often should I book a Gold deep cleaning?", a: "We recommend booking a Gold deep cleaning once every 3 to 6 months to maintain high hygiene standards." },
      { q: "What preparation is needed from my end?", a: "Ensure continuous water and electricity supply so our scrubbing machines and vacuums can run without interruption." }
    ],
    apartmentSizes: [
      { label: "1 BHK", price: 3759 },
      { label: "2 BHK", price: 4859 },
      { label: "3 BHK", price: 5959 },
      { label: "4 BHK", price: 7059 },
      { label: "5 BHK", price: 8159 }
    ]
  },
  "diamond-apt-deep": {
    covered: [
      "Includes everything in Gold Plan",
      "Sofa, carpet & mattress shampooing"
    ],
    tools: [
      "Wet shampoo extraction machine",
      "Specialized fabric shampoo",
      "Floor scrubbing & polishing machine",
      "Wet & dry vacuum cleaner"
    ],
    ready: [
      "Clear access around sofa and bed mattress"
    ],
    faqs: [
      { q: "What is included in the Diamond plan?", a: "It includes everything in the Gold plan plus intensive wet shampooing and extraction wash of your sofas and bed mattresses." },
      { q: "How long does the sofa and mattress take to dry?", a: "Under ordinary ceiling fan ventilation, it takes about 3 to 4 hours to dry completely after shampooing." },
      { q: "Does shampooing remove deep oil or ink stains?", a: "Shampooing removes dirt, dust mites, sweat stains, and minor spots. Permanent ink or old oil stains may fade but might not disappear completely." },
      { q: "Are carpets clean included in this package?", a: "Yes, vacuuming and light spot cleaning of carpets are included. Deep carpet shampooing can be requested separately." },
      { q: "How many cleaners are sent for a Diamond plan?", a: "We send a dedicated team of 3 to 4 professionals equipped with shampoo extraction machines." },
      { q: "Do you sanitize bathrooms?", a: "Yes, we perform complete sanitization of toilets, basins, showers, taps, and wall tiles." },
      { q: "Is this package suitable for move-in cleaning?", a: "Yes, this is our most comprehensive premium package, perfect for both move-in and deep annual cleanups." },
      { q: "Are your chemicals safe for pets and infants?", a: "Yes, we use safe, non-toxic, eco-certified cleaning solutions that leave no hazardous residues." }
    ],
    apartmentSizes: [
      { label: "1 BHK", price: 4579 },
      { label: "2 BHK", price: 5879 },
      { label: "3 BHK", price: 7179 },
      { label: "4 BHK", price: 8479 },
      { label: "5 BHK", price: 9779 }
    ]
  },
  "furnished-apt-deep": {
    covered: [
      "Bedroom & Living Room deep dusting & vacuuming",
      "Kitchen counters, slab, and exterior cabinet deep cleaning",
      "Bathroom floor scrubbing, wall tiles descaling, toilet deep clean",
      "Sofa, carpet, and mattress vacuuming",
      "Balcony cleaning & floor washing",
      "Doors, windows, fans, and light fixture dusting"
    ],
    tools: [
      "Heavy duty floor scrubbing machine",
      "Wet & dry vacuum cleaner",
      "Eco-friendly sanitizing chemicals",
      "Microfiber dusting cloths & mops",
      "Stain removal agents"
    ],
    ready: [
      "Ensure running water & electricity are available",
      "Store fragile items and valuables safely away",
      "Remove toiletries and clothes from areas to clean"
    ],
    faqs: [
      { q: "Does this include inside cabinet cleaning?", a: "Standard furnished cleaning includes exterior cabinet cleaning. You can add interior cabinet cleaning under requirements." },
      { q: "Are sofa and carpet wet shampooed?", a: "Sofa/carpet vacuuming is included. Wet shampooing can be selected as an add-on requirement." },
      { q: "How long does it take?", a: "It typically takes 3 to 4 hours depending on the BHK size." }
    ],
    apartmentSizes: [
      { label: "1 BHK", price: 3499 },
      { label: "2 BHK", price: 3899 },
      { label: "3 BHK", price: 4799 },
      { label: "4 BHK", price: 5699 }
    ],
    kitchenOptions: [
      { id: "kit-ext", name: "Cabinet exterior & stove", price: 0 },
      { id: "kit-int", name: "Cabinet interior with utensil arrangement", price: 499 },
      { id: "kit-chimney", name: "Chimney deep cleaning", price: 399 },
      { id: "kit-fridge", name: "Refrigerator deep cleaning", price: 449 }
    ],
    sofaOptions: [
      { id: "sofa-vac", name: "Dry vacuuming (Sofa & Mattress)", price: 0 },
      { id: "sofa-mattress", name: "Mattress shampoo (per bed)", price: 439 },
      { id: "sofa-wet-3", name: "Sofa wet shampoo (3/4 seater)", price: 449 },
      { id: "sofa-wet-5", name: "Sofa wet shampoo (5/6 seater)", price: 749 }
    ]
  },
  "unfurnished-apt-deep": {
    covered: [
      "Machine floor scrubbing & vacuuming",
      "Deep cleaning of empty kitchen cabinets & cupboards",
      "Sanitization of bathrooms, toilets, sinks, and wall tiles",
      "Window frames, doors, tracks, and glass cleaning",
      "Wall dry dusting and cobweb removal",
      "Balcony cleaning & floor washing"
    ],
    tools: [
      "Floor scrubbing & polishing machine",
      "Wet & dry vacuum cleaner",
      "Eco-friendly bathroom & kitchen cleaners",
      "Glass cleaning kits",
      "Scrubbing brushes & microfiber cloths"
    ],
    ready: [
      "Keep all cupboards and drawers empty",
      "Ensure continuous water and power supply",
      "Provide access to all rooms and balconies"
    ],
    faqs: [
      { q: "Is this service for empty apartments only?", a: "Yes, it is designed specifically for unoccupied or unfurnished apartments before moving in or after moving out." },
      { q: "What areas are cleaned under Unoccupied Apartment deep cleaning?", a: "We clean floors, windows, tracks, kitchen cabinets (interior/exterior), bathrooms, and balconies." },
      { q: "Do you clean the interior of cupboards?", a: "Yes, since the apartment is unoccupied, we clean the interiors and exteriors of all empty cabinets and drawers." },
      { q: "How long does it take?", a: "It takes approximately 3 to 4 hours depending on the BHK size and post-construction dust levels." },
      { q: "Is post-construction cleanup covered?", a: "Yes, we handle dust, paint splatters, plaster, and minor cement marks on tiles or windows." },
      { q: "Do you bring your own supplies?", a: "Yes, our team brings all professional scrubbing machines, vacuum cleaners, ladders, and eco-friendly chemicals." },
      { q: "What if there is no water or electricity?", a: "Water and power are essential for our machines. Please ensure they are available before we start." },
      { q: "Is wall painting or repair dust covered?", a: "We perform dry wall dusting. Heavy plaster dust from fresh construction is vacuumed and wiped." }
    ],
    apartmentSizes: [
      { label: "1 BHK", price: 3139 },
      { label: "2 BHK", price: 3699 },
      { label: "3 BHK", price: 4499 },
      { label: "4 BHK", price: 5199 }
    ]
  },
  "unoccupied-bungalow-deep": {
    covered: [
      "Machine floor scrubbing, window grilles, and tracks clean",
      "Deep clean of empty kitchen cabinets & cupboards",
      "Thorough sanitization of bathrooms & fixtures",
      "Wall dry dusting, cobweb removal, balconies wash"
    ],
    tools: [
      "Floor scrubbing machine",
      "Wet & dry vacuum cleaner",
      "Glass cleaning kits",
      "Scrubbing brushes & microfiber cloths"
    ],
    ready: [
      "Keep all cupboards and wardrobes empty",
      "Ensure water and power supply"
    ],
    faqs: [
      { q: "Is this suitable for a newly built bungalow?", a: "Yes, it is designed for empty or newly constructed bungalows before move-in, focusing on heavy post-construction dust removal." },
      { q: "Do you clean empty wardrobes and cabinets inside?", a: "Yes, we deep clean the interior and exterior of all empty wardrobes, cupboards, and kitchen cabinets." },
      { q: "How long does Unoccupied Bungalow cleaning take?", a: "It usually takes 5 to 7 hours depending on the size and amount of construction residue." },
      { q: "Do you clean windows and sliding doors?", a: "Yes, we thoroughly scrub sliding window tracks, frames, panes, and meshes to remove dust and cement marks." },
      { q: "What machinery do you use?", a: "We use heavy-duty single-disc scrubbing machines, vacuum cleaners, and high-pressure jet washers." },
      { q: "Is water and power supply mandatory?", a: "Yes, continuous power and running water are absolutely essential for our heavy machines to operate." },
      { q: "Do you clean the terrace and balconies?", a: "Yes, we wash and machine scrub all balconies, terraces, and entrance steps." },
      { q: "What about paint and cement stains on floors?", a: "We use professional scraper tools and mild solvents to safely remove paint drips and cement marks without damaging the tiles." }
    ],
    bungalowSizes: [
      { label: "1 BHK", price: 4419 },
      { label: "2 BHK", price: 4919 },
      { label: "3 BHK", price: 6419 },
      { label: "4 BHK", price: 8419 },
      { label: "5 BHK", price: 10419 }
    ]
  },
  "classic-bungalow-deep": {
    covered: [
      "Bungalow-scale deep sanitation of all bathrooms, toilets and kitchen areas",
      "Heavy-duty floor machine scrubbing for staircases, hallways and balconies",
      "Complete ceiling dusting, cobweb removal, and fan/lighting wash",
      "Comprehensive exterior glass panel, grille, and window frame washing"
    ],
    tools: [
      "Floor scrubbing machine",
      "Wet & dry vacuum cleaner",
      "Eco-friendly cleaning solutions",
      "Scrubbing brushes & microfiber cloths"
    ],
    ready: [
      "Keep fragile items secured",
      "Ensure continuous water and power supply"
    ],
    faqs: [
      { q: "How long does a Classic bungalow deep cleaning take?", a: "It typically takes 5 to 6 hours due to multi-level structures, staircases, and larger areas." },
      { q: "Are staircases and railings included?", a: "Yes, we perform machine scrubbing on stairs and wet wipe all railings and banisters." },
      { q: "Do you clean the terrace and porch?", a: "We perform basic sweeping and washing of the immediate entrance porch and balconies. Open terrace cleaning can be requested." },
      { q: "Do you clean the overhead water tank?", a: "No, overhead or underground water tank cleaning is a specialized service not included in home deep cleaning." },
      { q: "How many cleaners are sent for a Classic bungalow?", a: "We assign a team of 3 to 4 professional cleaners equipped with industrial floor scrubbers." },
      { q: "Is kitchen chimney cleaning included?", a: "We perform exterior wiping of the chimney and stove. Deep chemical degreasing of chimney filters is not included in Classic." },
      { q: "Do you clean windows on upper floors?", a: "Yes, we clean all reachable window panes and frames from the inside and balconies." },
      { q: "What if I have high ceilings?", a: "Our team carries ladders to clean fans, lights, and cobwebs from high ceilings up to 10-12 feet." }
    ],
    bungalowSizes: [
      { label: "1 BHK", price: 4439 },
      { label: "2 BHK", price: 5439 },
      { label: "3 BHK", price: 6439 },
      { label: "4 BHK", price: 7439 },
      { label: "5 BHK", price: 8439 }
    ]
  },
  "gold-bungalow-deep": {
    covered: [
      "All package features included in the Classic bungalow plan",
      "Multi-level cupboard interior cleaning & polishing (if empty)",
      "Kitchen drawer utensil removal, sanitizing and organized layout"
    ],
    tools: [
      "Floor scrubbing machine",
      "Wet & dry vacuum cleaner",
      "Cabinet cleaners & polishes"
    ],
    ready: [
      "Keep wardrobes empty for interior clean"
    ],
    faqs: [
      { q: "What makes the Gold plan different for bungalows?", a: "It includes everything in the Classic plan plus deep interior cupboard cleaning, cabinet sanitization, and kitchen drawer utensil rearrangement." },
      { q: "Should I empty the cupboards beforehand?", a: "Emptying them helps us clean more thoroughly, but if utensils are present in the kitchen, we will pack, clean, and rearrange them." },
      { q: "Do you wipe down walls?", a: "We perform dry wall dusting. Spot wet wiping is done for switchboards and minor stains around door frames." },
      { q: "Do you clean light fixtures and chandeliers?", a: "We clean standard ceiling lights, fans, and wall fixtures. Delicate crystal chandeliers are excluded due to safety risks." },
      { q: "How often should I get my bungalow deep cleaned?", a: "We recommend a Gold deep cleaning every 6 months to prevent heavy dust accumulation in large villas." },
      { q: "Are your chemicals safe for wooden floors?", a: "Yes, we use specialized neutral cleaners safe for hardwood, laminate, marble, and granite floors." },
      { q: "Do you clean the garage or parking area?", a: "Yes, sweeping and high-pressure washing of the garage or parking floor are included." },
      { q: "Can I customize the areas to be cleaned?", a: "You can instruct our supervisor on-site about specific priority rooms or zones." }
    ],
    bungalowSizes: [
      { label: "1 BHK", price: 6729 },
      { label: "2 BHK", price: 8229 },
      { label: "3 BHK", price: 9729 },
      { label: "4 BHK", price: 11229 },
      { label: "5 BHK", price: 12729 }
    ]
  },
  "diamond-bungalow-deep": {
    covered: [
      "All premium package features included in the Gold bungalow plan",
      "Eco-friendly wet shampoo wash of sofas and master bed mattresses",
      "High-pressure wash of stairs, patio floors and outer facade walls"
    ],
    tools: [
      "Wet shampoo extraction machine",
      "High-pressure washer",
      "Floor scrubbing machine",
      "Wet & dry vacuum cleaner"
    ],
    ready: [
      "Clear access around patio and facade walls"
    ],
    faqs: [
      { q: "What premium services are included in the Diamond bungalow plan?", a: "It includes Gold plan services plus complete wet shampoo wash of sofas/mattresses and high-pressure washing of patio, stairs, and outer facade walls." },
      { q: "How is facade cleaning performed?", a: "We use high-pressure water jet wash machines to clean reachable exterior walls, entry pathways, and gates." },
      { q: "How long does the sofa and mattress take to dry?", a: "They usually dry within 3 to 5 hours depending on natural ventilation and fan speed." },
      { q: "Are carpets and rugs shampooed in this plan?", a: "Vacuuming and spot treatment of carpets are included. Complete carpet shampoo washing can be added on request." },
      { q: "How many cleaners are assigned for a Diamond bungalow?", a: "We send a large team of 4 to 6 professionals with heavy machinery and shampoo extractors." },
      { q: "Does it remove grease stains from the kitchen walls?", a: "Yes, we use strong food-grade degreasers to remove grease oil splatters from kitchen wall tiles." },
      { q: "Is garden cleaning or lawn mowing included?", a: "No, garden maintenance, landscaping, and lawn mowing are not included in our home cleaning service." },
      { q: "What if I am not satisfied with the cleaning?", a: "We offer a 3-day service warranty. If any area is missed or poorly cleaned, we will re-clean it for free." }
    ],
    bungalowSizes: [
      { label: "1 BHK", price: 8729 },
      { label: "2 BHK", price: 10729 },
      { label: "3 BHK", price: 12729 },
      { label: "4 BHK", price: 14729 },
      { label: "5 BHK", price: 16729 }
    ]
  },
  "partial-home-clean": {
    covered: [
      "Custom room deep cleaning (bedrooms, living areas, and balconies)",
      "Kitchen sanitization including countertops, slabs, and stove scrubbing",
      "Bathroom floor scrubbing, tile descaling, and toilet sanitization"
    ],
    tools: [
      "Handheld scrubbers & brushes",
      "Safe, eco-friendly surface cleaners",
      "Microfiber cloths & mops"
    ],
    ready: [
      "Keep selected rooms/balconies accessible",
      "Ensure water supply is available"
    ],
    faqs: [
      { q: "What is a quick extra service?", a: "It is a targeted room or area cleaning service, ideal when you don't need the entire house deep cleaned." },
      { q: "Which rooms can I select for cleaning?", a: "You can choose specific bathrooms, kitchens, bedrooms, or living rooms as per your requirement." },
      { q: "How long does a partial cleaning take?", a: "It typically takes 1.5 to 3 hours depending on the number of rooms selected." },
      { q: "Do you bring your own cleaning agents?", a: "Yes, our team brings all required cleaning sprays, microfiber cloths, and manual scrubbing brushes." },
      { q: "Is machine floor scrubbing included?", a: "For partial room cleaning, we perform manual floor scrubbing and wet mopping. Single-disc machine scrubbing is not included unless added separately." },
      { q: "Can I add sofa cleaning to this?", a: "Yes, you can combine this with our standalone Sofa Cleaning service." },
      { q: "Do you clean inside kitchen cabinets in partial cleaning?", a: "Kitchen cleaning covers exterior surfaces, countertop, stove, and sink. Interior cabinet cleaning is not standard in partial cleaning." },
      { q: "What preparation do I need?", a: "Just ensure basic access to the rooms and that water/power supply are available." }
    ],
    roomOptions: [
      { id: "room-none", name: "Not required (Bedroom/Living Room)", price: 0 },
      { id: "room-bed", name: "Bedroom cleaning", price: 999 },
      { id: "room-living", name: "Living room cleaning", price: 1199 },
      { id: "room-dusting", name: "Full home dusting", price: 1499 }
    ],
    kitchenOptions: [
      { id: "kit-none", name: "Not required (Kitchen & Appliances)", price: 0 },
      { id: "kit-clean", name: "Kitchen deep cleaning", price: 999 },
      { id: "kit-appliance", name: "Appliances cleaning (Fridge/Chimney/Oven)", price: 799 },
      { id: "kit-interior", name: "Kitchen Interior & exterior deep clean", price: 1499 },
      { id: "kit-exterior", name: "Kitchen Exterior-only deep clean", price: 999 }
    ],
    bathOptions: [
      { id: "bath-none", name: "Not required (Bathroom & Balcony)", price: 0 },
      { id: "bath-1", name: "1 Bathroom deep clean", price: 549 },
      { id: "bath-2", name: "2 Bathrooms deep clean", price: 918 },
      { id: "balc-1", name: "1 Balcony scrubbing", price: 299 }
    ]
  },
  "balcony-clean-under-4": {
    covered: ["Scrubbing of balcony floor", "Wiping of balcony railings", "Cleaning of drainage outlet"],
    tools: ["Scrubbing brush", "Eco-friendly cleaning agents", "Microfiber cloth"],
    ready: ["Clear any plants or furniture from the balcony", "Ensure access to water and power outlets"],
    faqs: [
      { q: "How long does a small balcony clean take?", a: "It typically takes 20-30 minutes." },
      { q: "Do you clean the sliding door frame too?", a: "Yes, we wipe down the door frames bordering the balcony." },
      { q: "Is pigeon droppings removal covered?", a: "Yes, we remove pigeon droppings and sanitize the area." },
      { q: "Are cleaning chemicals safe for pets?", a: "Yes, we use safe, non-toxic cleaning agents." },
      { q: "Do you offer a satisfaction warranty?", a: "We guarantee quality work and will address any spots missed." },
      { q: "What if there is heavy dust accumulation?", a: "We perform deep manual scrubbing to remove thick dust layers." },
      { q: "Do you wash the balcony wall?", a: "We do localized spot wiping on balcony walls, not complete high-pressure wash." },
      { q: "Are windows bordering the balcony cleaned?", a: "Only the exterior frame and panes facing the balcony are wiped." }
    ]
  },
  "balcony-clean-above-4": {
    covered: ["Deep scrubbing of large balcony floor", "Wiping of railings and glass partitions", "Drainage mesh cleaning"],
    tools: ["Scrubbing brush & wipers", "Eco-friendly surface cleaner", "Microfiber cloth"],
    ready: ["Clear all balcony furniture and plants", "Provide water and power access"],
    faqs: [
      { q: "How long does it take?", a: "It takes about 35-45 minutes depending on total length." },
      { q: "Do you clean glass railings?", a: "Yes, glass balustrades and frames are polished on both sides." },
      { q: "Is high-pressure washing done?", a: "We use manual scrubbing and floor wipers. High pressure wash is not included." },
      { q: "Do you remove tiles stains?", a: "Yes, we scrub tile grout and surface stains to clear scaling." },
      { q: "What if rain occurs during the service?", a: "We will reschedule if the balcony is open and exposed to heavy rain." },
      { q: "Are walls washed completely?", a: "No, we perform dry dusting and spot wiping of wall surfaces." },
      { q: "Should I clear the furniture?", a: "Yes, please clear heavy furniture beforehand for a complete clean." },
      { q: "Are drainage pipes cleared?", a: "We clear the surface drain filter mesh. Deep blockages are not covered." }
    ]
  },
  "window-clean-under-4": {
    covered: ["Streak-free washing of window panes", "Vacuuming of sliding tracks", "Wiping of window frame & grilles"],
    tools: ["Glass cleaner spray", "Window wiper & squeeze", "Crevice vacuum nozzle"],
    ready: ["Ensure clear access to the window areas", "Open curtains/blinds beforehand"],
    faqs: [
      { q: "How long does it take?", a: "It takes around 20-30 minutes per window." },
      { q: "Is track cleaning included?", a: "Yes, we vacuum and scrub sliding window tracks thoroughly." },
      { q: "Do you clean mosquito mesh?", a: "Yes, we dry dust and wipe mosquito screens." },
      { q: "Are grilles washed or wiped?", a: "We wipe window grilles with damp microfiber cloths." },
      { q: "What chemical is used on glass?", a: "We use professional streak-free glass cleaning solutions." },
      { q: "Is the outside window pane cleaned?", a: "Yes, as long as it is safely reachable from the inside or balcony." },
      { q: "Do you repair sliding windows?", a: "No, we only provide cleaning services." },
      { q: "Is paint stain removal included?", a: "Minor paint spots on glass are cleared using scrapers." }
    ]
  },
  "window-clean-above-4": {
    covered: ["Deep cleaning of large window panes", "Vacuuming & washing of tracks", "Grille & frame dusting & wet wipe"],
    tools: ["Glass cleaner & squeeze", "Track cleaning brush", "Microfiber cloths"],
    ready: ["Clear nearby items & open blinds/curtains", "Ensure water access is available"],
    faqs: [
      { q: "How long does a large window take?", a: "It typically takes about 45 to 60 minutes." },
      { q: "Do you clean high-rise external glass?", a: "Only the panes reachable safely from inside. We do not do harness-based external washing." },
      { q: "Is track mud scrubbing included?", a: "Yes, we scrub encrusted mud out of the tracks." },
      { q: "Are meshes washed with water?", a: "Yes, detachable meshes are washed and wiped down." },
      { q: "What if the window glass is cracked?", a: "For safety reasons, we do not clean cracked or damaged window panels." },
      { q: "Do you clean double-hung windows?", a: "Yes, both single and double pane slider systems are cleaned." },
      { q: "Are blinds cleaned too?", a: "No, blinds dusting is a separate add-on service." },
      { q: "Are chemicals safe for aluminum frames?", a: "Yes, our chemicals are neutral and safe for powder-coated aluminum or UPVC frames." }
    ]
  },
  "dining-table-clean": {
    covered: ["Sanitization of tabletop surface", "Wiping of table legs and framework", "Dusting and wiping of up to 6 dining chairs"],
    tools: ["Surface sanitizer", "Microfiber cloths"],
    ready: ["Remove all plates, utensils, and table mats before cleaning"],
    faqs: [
      { q: "How long does it take?", a: "It takes about 30 minutes." },
      { q: "Do you polish wooden tables?", a: "We perform deep sanitization and wipe. Wood polishing lacquer is not included." },
      { q: "Are chairs cleaned inside this?", a: "Yes, wiping of up to 6 chairs is included in this plan." },
      { q: "Is fabric chair shampooing included?", a: "Fabric upholstery shampoo wash is not included, only dry vacuuming/wiping." },
      { q: "Do you clean glass tabletops?", a: "Yes, glass tabletops are cleaned with streak-free glass spray." },
      { q: "Do you clean table runners or cloths?", a: "No, we only wipe down the hard surfaces." },
      { q: "Is leather chair polishing included?", a: "No, we wipe leatherette chairs with a damp cloth, no chemical polish is applied." },
      { q: "Do you clean dining table extensions?", a: "Yes, extensions are wiped if opened by the customer." }
    ]
  },
  "microwave-clean": {
    covered: ["Deep degreasing of microwave interior", "Wiping of glass door (inside & out)", "Sanitization of exterior body and buttons"],
    tools: ["Food-safe degreasing spray", "Scrubbing sponges"],
    ready: ["Ensure microwave is plugged out and cool before cleaning"],
    faqs: [
      { q: "How long does a microwave clean take?", a: "It takes about 15 to 20 minutes." },
      { q: "Are food-safe chemicals used?", a: "Yes, we use non-toxic, food-grade degreasers inside the cavity." },
      { q: "Do you clean the turntable glass plate?", a: "Yes, the glass tray is removed, washed, and dried." },
      { q: "Is convection oven cleaning covered?", a: "Yes, this covers solo, grill, and convection microwave ovens." },
      { q: "Does it remove old burnt smells?", a: "Our cleaning removes grease which causes smells, helping refresh the unit." },
      { q: "Is OTG cleaning covered?", a: "OTG ovens are not covered under this, only standard microwave ovens." },
      { q: "Are heating elements cleaned?", a: "We wipe around heating elements gently to avoid any component damage." },
      { q: "What if the microwave is not working?", a: "We only clean units that are in working condition." }
    ]
  }
};

export function FullHouseCleaningModal({ activeSubTab: propActiveSubTab, cart, setCart, onClose, onCheckout }) {
  const [activeTab, setActiveTab] = useState(
    propActiveSubTab === "Occupied Apartment" ? "full_apartment" :
      propActiveSubTab === "Unoccupied Apartment" ? "unoccupied_apartment" :
        propActiveSubTab === "Occupied Bungalow/duplex" ? "full_bungalow" :
          propActiveSubTab === "Unoccupied Bungalow/duplex" ? "unoccupied_bungalow" : "partial_home"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedServiceDetails, setSelectedServiceDetails] = useState(null);
  const [activeFaq, setActiveFaq] = useState(null);

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

  // States for requirements selections in the details drawer/modal
  const [selectedSizeIdx, setSelectedSizeIdx] = useState(0); // Index for BHK sizes
  const [selectedKitchenOpt, setSelectedKitchenOpt] = useState(null);
  const [selectedSofaOpt, setSelectedSofaOpt] = useState(null);
  const [selectedCupboardOpt, setSelectedCupboardOpt] = useState(null);
  const [selectedFloorOpt, setSelectedFloorOpt] = useState(null);
  const [selectedExtraOpts, setSelectedExtraOpts] = useState([]); // Multiple for unfurnished extras
  const [selectedPartialOpts, setSelectedPartialOpts] = useState([]); // Multiple for partial cleaning choices

  const addCustomizedItemToCart = (baseId, name, price, duration, detailsString) => {
    const uniqueId = `${baseId}-${Date.now()}`;
    const cartName = `${name} (${detailsString})`;
    setCart(prev => [...prev, { id: uniqueId, name: cartName, price, duration, quantity: 1 }]);
  };

  const removeItemFromCart = (id) => {
    setCart(prev => prev.filter(c => c.id !== id));
  };

  const getActiveServices = () => {
    const list = FULL_HOUSE_SERVICES[activeTab] || [];
    if (!searchQuery) return list;
    return list.filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase()) || a.includes.some(inc => inc.toLowerCase().includes(searchQuery.toLowerCase())));
  };

  const activeServices = getActiveServices();
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const getSectionTitle = () => {
    if (activeTab === "full_apartment") return "OCCUPIED APARTMENT CLEANING";
    if (activeTab === "unoccupied_apartment") return "UNOCCUPIED APARTMENT CLEANING";
    if (activeTab === "full_bungalow") return "OCCUPIED BUNGALOW CLEANING";
    if (activeTab === "unoccupied_bungalow") return "UNOCCUPIED BUNGALOW CLEANING";
    return "QUICK EXTRA SERVICES";
  };

  const handleOpenDetails = (service) => {
    setSelectedServiceDetails(service);
    setSelectedSizeIdx(0);
    const details = HOUSE_DETAILS_CONTENT[service.id] || {};
    setSelectedKitchenOpt(details.kitchenOptions ? details.kitchenOptions[0] : null);
    setSelectedSofaOpt(details.sofaOptions ? details.sofaOptions[0] : null);
    setSelectedCupboardOpt(details.cupboardOptions ? details.cupboardOptions[0] : null);
    setSelectedFloorOpt(details.floorOptions ? details.floorOptions[0] : null);
    setSelectedExtraOpts([]);
    setSelectedPartialOpts([]);
    setActiveFaq(null);
  };

  const getModalPrice = () => {
    if (!selectedServiceDetails) return 0;
    const details = HOUSE_DETAILS_CONTENT[selectedServiceDetails.id] || {};

    let basePrice = selectedServiceDetails.price;
    if (details.apartmentSizes) {
      basePrice = details.apartmentSizes[selectedSizeIdx]?.price || basePrice;
    } else if (details.bungalowSizes) {
      basePrice = details.bungalowSizes[selectedSizeIdx]?.price || basePrice;
    }

    const kitchenPrice = selectedKitchenOpt ? selectedKitchenOpt.price : 0;
    const sofaPrice = selectedSofaOpt ? selectedSofaOpt.price : 0;
    const cupboardPrice = selectedCupboardOpt ? selectedCupboardOpt.price : 0;
    const floorPrice = selectedFloorOpt ? selectedFloorOpt.price : 0;
    const extrasPrice = selectedExtraOpts.reduce((sum, opt) => sum + opt.price, 0);
    const partialPrice = selectedPartialOpts.reduce((sum, opt) => sum + opt.price, 0);

    return basePrice + kitchenPrice + sofaPrice + cupboardPrice + floorPrice + extrasPrice + partialPrice;
  };

  const handleProceedFromModal = () => {
    if (!selectedServiceDetails) return;
    const details = HOUSE_DETAILS_CONTENT[selectedServiceDetails.id] || {};

    let baseLabel = "";
    if (details.apartmentSizes) {
      baseLabel = details.apartmentSizes[selectedSizeIdx]?.label || "";
    } else if (details.bungalowSizes) {
      baseLabel = details.bungalowSizes[selectedSizeIdx]?.label || "";
    }

    let detailParts = [];
    if (baseLabel) detailParts.push(baseLabel);
    if (selectedKitchenOpt && selectedKitchenOpt.price > 0) detailParts.push(selectedKitchenOpt.name);
    if (selectedSofaOpt && selectedSofaOpt.price > 0) detailParts.push(selectedSofaOpt.name);
    if (selectedCupboardOpt && selectedCupboardOpt.price > 0) detailParts.push(selectedCupboardOpt.name);
    if (selectedFloorOpt && selectedFloorOpt.price > 0) detailParts.push(selectedFloorOpt.name);

    selectedExtraOpts.forEach(opt => detailParts.push(opt.name));
    selectedPartialOpts.forEach(opt => detailParts.push(opt.name));

    const detailsString = detailParts.join(", ") || "Standard Package";
    const finalPrice = getModalPrice();

    addCustomizedItemToCart(selectedServiceDetails.id, selectedServiceDetails.name, finalPrice, selectedServiceDetails.duration, detailsString);
    setSelectedServiceDetails(null);
  };

  return (
    <div className="w-full text-slate-700 bg-white min-h-screen">
      {/* Sticky Header + Tabs */}
      <div className="sticky top-16 z-20 bg-white shadow-sm border-b border-slate-100">
        <div className="p-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white py-4 px-6">
          <div>
            <button
              onClick={onClose}
              className="flex items-center gap-1 text-slate-500 hover:text-emerald-700 font-semibold mb-2 text-xs transition-colors border-none bg-transparent cursor-pointer"
            >
              <ChevronLeft size={16} /> Back to Services
            </button>
            <h2 className="text-xl font-black text-slate-900">Full Home Cleaning</h2>
          </div>

        </div>

        {/* Sub-tabs exactly styled like Sofa/Kitchen/Bathroom Cleaning */}
        <div className="flex gap-5 pb-3 pt-4 px-6 border-b border-slate-100 justify-start bg-white overflow-x-auto scrollbar-none">
          {FULL_HOUSE_SUB_TABS.map(tab => {
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setSearchQuery(""); }}
                className="flex flex-col items-center justify-start p-1.5 transition-all cursor-pointer text-center bg-transparent w-[110px] shrink-0 border-none"
              >
                <img
                  src={tab.image}
                  alt={tab.name}
                  className={`w-14 h-14 object-cover rounded-xl mb-1.5 transition-all duration-200 ${isSelected ? "scale-[1.05] shadow-md border-2 border-white" : "opacity-80 hover:opacity-100"
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
      <div className="flex flex-col lg:flex-row flex-1 pt-6 px-6 max-w-7xl mx-auto gap-8 pb-20">
        {/* Left Column */}
        <div className="flex-1 space-y-6">
          <div className="pt-1 mb-4 flex items-center gap-2">
            <div className="w-1.5 h-4 bg-emerald-600 rounded-full" />
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">
              {getSectionTitle()}
            </h3>
          </div>

          {/* Tab Banner Image */}
          {(() => {
            const banners = {
              full_apartment: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=1200&q=80&fit=crop",
              unoccupied_apartment: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&q=80&fit=crop",
              full_bungalow: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=1200&q=80&fit=crop",
              unoccupied_bungalow: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80&fit=crop",
              partial_home: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=1200&q=80&fit=crop"
            };
            const bannerUrl = banners[activeTab];
            if (!bannerUrl) return null;
            return (
              <div className="w-full aspect-[10/3] bg-slate-100 rounded-2xl overflow-hidden mb-5 border border-slate-100/60">
                <img
                  src={bannerUrl}
                  alt={getSectionTitle()}
                  className="w-full h-full object-cover object-center"
                />
              </div>
            );
          })()}

          <div className="space-y-4">
            {activeServices.map((service) => {
              return (
                <div key={service.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 relative transition-all hover:shadow-md">
                  <div className="flex flex-col sm:flex-row gap-5">
                    <div className="flex-1 order-2 sm:order-1">
                      <h4 className="font-extrabold text-slate-900 text-sm md:text-base mb-1.5">{service.name}</h4>

                      {service.description && (
                        <p className="text-xs text-slate-500 leading-relaxed max-w-xl mb-2">{service.description}</p>
                      )}

                      <div className="flex items-center gap-3 text-xs pt-1 mb-3">
                        <span className="text-base font-black text-slate-900">
                          {service.options && <span className="text-slate-500 font-medium text-xs mr-1">{service.options}</span>}
                          ₹{service.price}
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
                        onClick={() => handleOpenDetails(service)}
                        className="text-xs font-semibold text-blue-600 mt-2 hover:underline cursor-pointer border-none bg-transparent"
                      >
                        View details
                      </button>
                    </div>

                    <div className="relative shrink-0 w-full sm:w-[140px] order-1 sm:order-2 flex flex-col items-center">
                      <div className="w-full h-32 rounded-xl overflow-hidden bg-slate-100 shadow-sm border border-slate-100 mb-[-15px] z-0">
                        <img src={service.image} alt={service.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="w-24 z-10">
                        <button
                          onClick={() => handleOpenDetails(service)}
                          className="w-full bg-white border border-slate-200 text-emerald-600 font-extrabold text-xs py-2 rounded-lg hover:bg-slate-50 transition-all shadow-md flex items-center justify-center gap-1 uppercase cursor-pointer"
                        >
                          <ShoppingCart size={14} /> Add
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {activeServices.length === 0 && (
              <div className="py-10 text-center text-slate-400 text-sm">
                No services found.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Order Summary */}
        <div className="w-full lg:w-[320px]">
          <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm space-y-4 lg:sticky lg:top-48">
            <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
              <h5 className="font-extrabold text-xs text-slate-800 uppercase tracking-wide">Order Summary</h5>
              <span className="text-[10px] font-bold text-slate-400">{cart.length} items</span>
            </div>

            {cart.length > 0 ? (
              <div className="space-y-4 max-h-[250px] overflow-y-auto pr-1 scrollbar-thin">
                {cart.map(item => (
                  <div key={item.id} className="flex justify-between items-start text-xs gap-3">
                    <div className="flex-1">
                      <span className="font-bold text-slate-800 block leading-tight">{item.name}</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">{item.duration}</span>
                    </div>
                    <div className="text-right flex items-center gap-2">
                      <span className="font-extrabold text-slate-900">₹{(item.price * item.quantity).toLocaleString("en-IN")}</span>
                      <button onClick={() => removeItemFromCart(item.id)} className="text-red-500 hover:text-red-700 font-bold ml-1 border-none bg-transparent cursor-pointer">×</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400 text-[11px] px-4 leading-relaxed">
                No cleaning services added. Select from the packages on the left.
              </div>
            )}

            <div className="border-t border-slate-100 pt-3 space-y-2 text-xs">
              <div className="flex justify-between font-extrabold text-slate-900 text-sm pt-1">
                <span>Total Amount</span>
                <span>₹{subtotal.toLocaleString("en-IN")}</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                disabled={cart.length === 0}
                onClick={onCheckout}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:text-white/60 disabled:cursor-not-allowed text-white font-extrabold rounded-xl text-center text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer border-none"
              >
                Proceed to Schedule
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* View Details Drawer/Modal */}
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
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-800 bg-white/80 hover:bg-white p-1.5 rounded-full z-30 shadow-md transition-colors cursor-pointer border-none"
            >
              <X size={16} />
            </button>

            {/* Header image */}
            <div className="h-36 border-b border-slate-100 shrink-0">
              <img
                src={selectedServiceDetails.image}
                alt={selectedServiceDetails.name}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
              {/* Title & Ratings */}
              <div className="border-b border-slate-100 pb-5">
                <h3 className="text-base font-extrabold text-slate-900 mb-1">
                  {activeTab === "full_apartment" ? `Occupied Apartment - ${selectedServiceDetails.name}` :
                    activeTab === "full_bungalow" ? `Occupied Bungalow - ${selectedServiceDetails.name}` :
                      selectedServiceDetails.name}
                </h3>
                {activeTab !== "full_apartment" && activeTab !== "unoccupied_apartment" && activeTab !== "full_bungalow" && activeTab !== "unoccupied_bungalow" && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold mb-2">
                    <Star className="text-[#7C3AED] fill-[#7C3AED]" size={12} />
                    <span className="text-slate-800">{selectedServiceDetails.rating || "4.81"}</span>
                    <span className="text-slate-400 font-normal underline">({selectedServiceDetails.reviews || "1.7M bookings"})</span>
                  </div>
                )}
                <p className="text-xs text-slate-500 font-bold">
                  {(activeTab === "full_apartment" || activeTab === "unoccupied_apartment" || activeTab === "full_bungalow" || activeTab === "unoccupied_bungalow") ? "" : "Starts at "}₹{selectedServiceDetails.price} • {selectedServiceDetails.duration}
                </p>
              </div>

              {/* Requirements selection section */}
              {(() => {
                const details = HOUSE_DETAILS_CONTENT[selectedServiceDetails.id] || {};
                return (
                  <div className="space-y-6">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-2">Select Requirements</h4>

                    {/* 1. Size Selection (Apartment size or Bungalow size) */}
                    {details.apartmentSizes && (
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-800 block">Select size of apartment</label>
                        <div className="flex flex-wrap gap-2">
                          {details.apartmentSizes.map((size, idx) => (
                            <button
                              key={idx}
                              onClick={() => setSelectedSizeIdx(idx)}
                              className={`px-4 py-2.5 text-xs font-bold border rounded-xl transition-all cursor-pointer border-solid ${selectedSizeIdx === idx
                                  ? "border-emerald-600 bg-emerald-50/50 text-emerald-800 font-black scale-[1.02]"
                                  : "border-slate-200 hover:bg-slate-50 text-slate-700"
                                }`}
                            >
                              <div>{size.label}</div>
                              <div className="text-[10px] text-slate-400 mt-0.5">₹{size.price}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {details.bungalowSizes && (
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-800 block">Select overall size of bungalow</label>
                        <div className="flex flex-wrap gap-2">
                          {details.bungalowSizes.map((sz, idx) => {
                            const isChosen = selectedSizeIdx === idx;
                            return (
                              <button
                                key={idx}
                                onClick={() => setSelectedSizeIdx(idx)}
                                className={`px-3 py-2 text-xs font-bold border rounded-xl transition-all cursor-pointer border-solid ${isChosen
                                    ? "border-emerald-600 bg-emerald-50/50 text-emerald-800"
                                    : "border-slate-200 hover:bg-slate-50 text-slate-700"
                                  }`}
                              >
                                <div>{sz.label}</div>
                                <div className="text-[10px] text-slate-400 mt-0.5">₹{sz.price}</div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* B. Floor count for duplex/bungalow */}
                    {details.floorOptions && (
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-800 block">Select number of floors</label>
                        <div className="flex flex-wrap gap-2">
                          {details.floorOptions.map((opt) => (
                            <button
                              key={opt.id}
                              onClick={() => setSelectedFloorOpt(opt)}
                              className={`px-3 py-2 text-xs font-semibold border rounded-xl transition-all cursor-pointer border-solid ${selectedFloorOpt?.id === opt.id
                                  ? "border-emerald-600 bg-emerald-50/50 text-emerald-800"
                                  : "border-slate-200 hover:bg-slate-50 text-slate-700"
                                }`}
                            >
                              <div>{opt.name}</div>
                              <div className="text-[10px] text-slate-400 mt-0.5">+{opt.price > 0 ? `₹${opt.price}` : "Free"}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* C. Kitchen cabinets options */}
                    {details.kitchenOptions && (
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-800 block">Select kitchen cabinets & appliances</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {details.kitchenOptions.map((opt) => {
                            const isSelected = selectedKitchenOpt?.id === opt.id;
                            return (
                              <button
                                key={opt.id}
                                onClick={() => setSelectedKitchenOpt(opt)}
                                className={`p-3 text-left border rounded-xl transition-all cursor-pointer border-solid ${isSelected
                                    ? "border-emerald-600 bg-emerald-50/30 text-emerald-800"
                                    : "border-slate-100 hover:bg-slate-50 text-slate-700"
                                  }`}
                              >
                                <div className="text-xs font-bold">{opt.name}</div>
                                <div className="text-[10px] text-slate-500 mt-1">
                                  {opt.price > 0 ? `+₹${opt.price}/visit` : "+Free"}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* D. Sofa & upholstery options */}
                    {details.sofaOptions && (
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-800 block">Select Sofa & Cushion cleaning</label>
                        <div className="flex flex-wrap gap-2">
                          {details.sofaOptions.map((opt) => (
                            <button
                              key={opt.id}
                              onClick={() => setSelectedSofaOpt(opt)}
                              className={`px-3 py-2 text-xs font-semibold border rounded-xl transition-all cursor-pointer border-solid ${selectedSofaOpt?.id === opt.id
                                  ? "border-emerald-600 bg-emerald-50/50 text-emerald-800"
                                  : "border-slate-200 hover:bg-slate-50 text-slate-700"
                                }`}
                            >
                              <div>{opt.name}</div>
                              <div className="text-[10px] text-slate-400 mt-0.5">+{opt.price > 0 ? `₹${opt.price}/visit` : "Free"}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* E. Cupboard interior options */}
                    {details.cupboardOptions && (
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-800 block">Cupboards interior cleaning</label>
                        <div className="flex flex-wrap gap-2">
                          {details.cupboardOptions.map((opt) => {
                            const isChosen = selectedCupboardOpt?.id === opt.id;
                            return (
                              <button
                                key={opt.id}
                                onClick={() => setSelectedCupboardOpt(opt)}
                                className={`px-3 py-2 text-xs font-semibold border rounded-xl transition-all cursor-pointer border-solid ${isChosen
                                    ? "border-emerald-600 bg-emerald-50/50 text-emerald-800"
                                    : "border-slate-200 hover:bg-slate-50 text-slate-700"
                                  }`}
                              >
                                <div>{opt.name}</div>
                                <div className="text-[10px] text-slate-400 mt-0.5">+{opt.price > 0 ? `₹${opt.price}/visit` : "Free"}</div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* F. Unfurnished Extra Options */}
                    {details.extraOptions && (
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-800 block">Select extra room/area</label>
                        <div className="space-y-2">
                          {details.extraOptions.map((opt) => {
                            const isSelected = selectedExtraOpts.some(x => x.id === opt.id);
                            return (
                              <div
                                key={opt.id}
                                className={`flex justify-between items-center p-3 border rounded-xl transition-all ${isSelected ? "border-emerald-600 bg-emerald-50/30" : "border-slate-100"
                                  }`}
                              >
                                <span className="text-xs font-medium text-slate-700">{opt.name}</span>
                                <div className="flex items-center gap-3">
                                  <span className="text-xs font-bold text-slate-900">+{opt.price > 0 ? `₹${opt.price}/visit` : "Free"}</span>
                                  <button
                                    onClick={() => {
                                      if (isSelected) {
                                        setSelectedExtraOpts(prev => prev.filter(x => x.id !== opt.id));
                                      } else {
                                        setSelectedExtraOpts(prev => [...prev, opt]);
                                      }
                                    }}
                                    className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs cursor-pointer border ${isSelected
                                        ? "bg-emerald-600 border-emerald-600 text-white"
                                        : "bg-white border-slate-200 text-emerald-600 hover:bg-slate-50"
                                      }`}
                                  >
                                    {isSelected ? "✓" : "+"}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* G. Partial clean options (Custom rooms selection list) */}
                    {selectedServiceDetails.id === "partial-home-clean" && (
                      <div className="space-y-4">
                        {/* 1. Bedrooms & Living Room */}
                        {details.roomOptions && (
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-800 block">Select Bedroom/Living Room</label>
                            <div className="flex flex-wrap gap-2">
                              {details.roomOptions.map((opt) => {
                                const isSelected = selectedPartialOpts.some(p => p.id === opt.id) || (opt.id === "room-none" && !selectedPartialOpts.some(p => p.id.startsWith("room-") && p.id !== "room-none"));
                                return (
                                  <button
                                    key={opt.id}
                                    onClick={() => {
                                      if (opt.id === "room-none") {
                                        setSelectedPartialOpts(prev => prev.filter(p => !p.id.startsWith("room-")));
                                      } else {
                                        setSelectedPartialOpts(prev => {
                                          const filtered = prev.filter(p => !p.id.startsWith("room-"));
                                          return [...filtered, opt];
                                        });
                                      }
                                    }}
                                    className={`px-3 py-2 text-xs font-semibold border rounded-xl transition-all cursor-pointer border-solid ${isSelected
                                        ? "border-emerald-600 bg-emerald-50/50 text-emerald-800"
                                        : "border-slate-200 hover:bg-slate-50 text-slate-700"
                                      }`}
                                  >
                                    <div>{opt.name}</div>
                                    <div className="text-[10px] text-slate-500 mt-0.5">
                                      {opt.price > 0 ? `₹${opt.price}` : "Free"}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* 2. Kitchen Option */}
                        {details.kitchenOptions && (
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-800 block">Select Kitchen Cleaning</label>
                            <div className="flex flex-wrap gap-2">
                              {details.kitchenOptions.map((opt) => {
                                const isSelected = selectedPartialOpts.some(p => p.id === opt.id) || (opt.id === "kit-none" && !selectedPartialOpts.some(p => p.id.startsWith("kit-") && p.id !== "kit-none"));
                                return (
                                  <button
                                    key={opt.id}
                                    onClick={() => {
                                      if (opt.id === "kit-none") {
                                        setSelectedPartialOpts(prev => prev.filter(p => !p.id.startsWith("kit-")));
                                      } else {
                                        setSelectedPartialOpts(prev => {
                                          const filtered = prev.filter(p => !p.id.startsWith("kit-"));
                                          return [...filtered, opt];
                                        });
                                      }
                                    }}
                                    className={`px-3 py-2 text-xs font-semibold border rounded-xl transition-all cursor-pointer border-solid ${isSelected
                                        ? "border-emerald-600 bg-emerald-50/50 text-emerald-800"
                                        : "border-slate-200 hover:bg-slate-50 text-slate-700"
                                      }`}
                                  >
                                    <div>{opt.name}</div>
                                    <div className="text-[10px] text-slate-500 mt-0.5">
                                      {opt.price > 0 ? `₹${opt.price}` : "Free"}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* 3. Bathrooms & Balconies list */}
                        {details.bathOptions && (
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-800 block">Select Bathrooms & Balconies</label>
                            <div className="flex flex-wrap gap-2">
                              {details.bathOptions.map((opt) => {
                                const isSelected = selectedPartialOpts.some(p => p.id === opt.id) || (opt.id === "bath-none" && !selectedPartialOpts.some(p => (p.id.startsWith("bath-") || p.id.startsWith("balc-")) && p.id !== "bath-none"));
                                return (
                                  <button
                                    key={opt.id}
                                    onClick={() => {
                                      if (opt.id === "bath-none") {
                                        setSelectedPartialOpts(prev => prev.filter(p => !p.id.startsWith("bath-") && !p.id.startsWith("balc-")));
                                      } else {
                                        setSelectedPartialOpts(prev => {
                                          const isAlreadyChosen = prev.some(p => p.id === opt.id);
                                          if (isAlreadyChosen) {
                                            return prev.filter(p => p.id !== opt.id);
                                          } else {
                                            // Bathroom choices are mutually exclusive (e.g. either 1 or 2 bathrooms)
                                            let cleaned = prev;
                                            if (opt.id.startsWith("bath-")) {
                                              cleaned = prev.filter(p => !p.id.startsWith("bath-"));
                                            }
                                            return [...cleaned, opt];
                                          }
                                        });
                                      }
                                    }}
                                    className={`px-3 py-2 text-xs font-semibold border rounded-xl transition-all cursor-pointer border-solid ${isSelected
                                        ? "border-emerald-600 bg-emerald-50/50 text-emerald-800"
                                        : "border-slate-200 hover:bg-slate-50 text-slate-700"
                                      }`}
                                  >
                                    <div>{opt.name}</div>
                                    <div className="text-[10px] text-slate-500 mt-0.5">
                                      {opt.price > 0 ? `₹${opt.price}` : "Free"}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* What is Covered */}
              {(() => {
                const details = HOUSE_DETAILS_CONTENT[selectedServiceDetails.id] || {};
                const covered = details.covered || [];
                if (covered.length === 0) return null;
                return (
                  <div className="space-y-2.5 border-t border-slate-100 pt-5 text-left">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">What Is Covered</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {covered.map((item, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-slate-600">
                          <span className="text-slate-400 font-bold shrink-0 mt-0.5">•</span>
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Tools & Products We Use */}
              {(() => {
                const details = HOUSE_DETAILS_CONTENT[selectedServiceDetails.id] || {};
                const tools = details.tools || [];
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
                const details = HOUSE_DETAILS_CONTENT[selectedServiceDetails.id] || {};
                const ready = details.ready || [];
                if (ready.length === 0) return null;
                return (
                  <div className="space-y-2.5 border-t border-slate-100 pt-5 text-left">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">What You Need to Keep Ready</h4>
                    <div className="space-y-2">
                      {ready.map((item, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-slate-600">
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                          <span className="leading-relaxed">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Frequently Asked Questions */}
              {(() => {
                const details = HOUSE_DETAILS_CONTENT[selectedServiceDetails.id] || {};
                const faqs = details.faqs || [];
                if (faqs.length === 0) return null;
                return (
                  <div className="space-y-2.5 border-t border-slate-100 pt-5 text-left">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">Frequently Asked Questions</h4>
                    <div className="space-y-2">
                      {faqs.map((faq, idx) => {
                        const isFaqOpen = activeFaq === idx;
                        return (
                          <div key={idx} className="border border-slate-100 rounded-xl overflow-hidden bg-white shadow-sm transition-all duration-200">
                            <button
                              onClick={() => setActiveFaq(isFaqOpen ? null : idx)}
                              className="w-full p-3 flex justify-between items-center text-xs bg-white font-semibold text-left cursor-pointer hover:bg-slate-50/50 border-none outline-none"
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
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Sticky Footer */}
            <div className="border-t border-slate-100 p-4 bg-slate-50 flex items-center justify-between shrink-0">
              <div>
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Price</div>
                <div className="text-base font-black text-slate-900">₹{getModalPrice().toLocaleString("en-IN")}</div>
              </div>
              <button
                onClick={handleProceedFromModal}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-2.5 px-6 rounded-lg shadow-md transition-all uppercase tracking-wider cursor-pointer border-none"
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
