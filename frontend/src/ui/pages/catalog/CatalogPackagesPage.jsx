import React, { useEffect, useState, useMemo } from "react"
import {
  Plus, Edit2, Search, Truck, Wrench, Wind, Sparkles,
  Palette, Hammer, Carrot, Layers, Box, Tag, DollarSign,
  Clock, ShieldCheck, ChevronDown, ChevronUp, FolderOpen,
  Package as PackageIcon, Check, ArrowRight, Sparkle,
  Bike, Boxes, Zap, Droplets, ShoppingBag, CheckCircle2,
  SlidersHorizontal, ArrowUpRight, Trash2
} from "lucide-react"
import { apiRequest } from "../../../api/client.js"
import { Input, TextArea, Select, Modal } from "../../components/kit.jsx"
import { useToast, ToastBanner } from "./useToast.jsx"
import { SOFA_DETAIL_DATA } from "./sofaDetailData.js"
import { HOUSE_DETAILS_CONTENT } from "../FullHouseCleaningModal.jsx"

const DEFAULT_SUITABLE_PRESETS = {
  "2-wheeler-electric-express": [
    "Small parcels & packages",
    "Clothing & accessories",
    "Food & grocery orders",
    "Medicines & essentials",
    "Small electronic items",
    "Urgent deliveries",
  ],
  "2-wheeler": [
    "Small parcels & packages",
    "Documents & files",
    "Clothing & accessories",
    "Food & grocery orders",
    "Medicines & essentials",
    "Small electronic items",
    "Local shop deliveries",
  ],
  "3-wheeler": [
    "Groceries & provisions",
    "Small parcels & packages",
    "Clothing & cartons",
    "Small household items",
    "Small appliances",
    "Office supplies",
    "Local shop deliveries",
  ],
  "tata-ace": [
    "Household furniture",
    "Home appliances",
    "Grocery & retail stock",
    "Multiple cartons",
    "Small business goods",
    "Electronics",
    "Small construction materials",
    "Shop/warehouse deliveries",
  ],
  "pickup-8ft": [
    "Furniture & double beds",
    "Commercial inventory",
    "Warehouse transfers",
    "Event materials",
    "Medium machinery",
    "Bulk cartons",
    "Hardware & electrical goods",
    "Industrial deliveries",
  ],
  "1-7-ton": [
    "Heavy industrial machinery",
    "Factory raw materials",
    "Large appliances",
    "Bulk construction materials",
    "Industrial equipment",
    "Machinery",
    "Large commercial stock",
    "Multiple cartons & packages",
    "Warehouse/industrial goods",
  ],
  "1-rk-1-bhk-shifting": [
    "1 RK / 1 BHK Full Household",
    "Furniture disassembly & assembly",
    "Bubble wrap & carton packing",
    "Loading & unloading by verified crew",
    "Dedicated transport vehicle",
  ],
  "2-bhk-3-bhk-shifting": [
    "2 BHK / 3 BHK Large Household",
    "Heavy furniture & appliance packing",
    "Multi-layer bubble & foam protection",
    "Professional 4-6 member crew",
    "Large closed container truck",
  ],
  "villa-office-relocation": [
    "Villas, Bungalows & Corporate Offices",
    "IT hardware & server safe packing",
    "Customized crating & insurance support",
    "Dedicated relocation manager",
    "End-to-end unpacking & setup",
  ],
  "int-single-wall": [
    "Wall sanding & minor crack filling",
    "Double coat premium interior emulsion",
    "Eco-friendly, low VOC paints",
    "Complete masking & floor protection",
    "Post-job basic cleanup",
    "1-year warranty on chipping & flaking",
  ],
  "int-one-room": [
    "Wall sanding & minor crack filling",
    "Double coat premium interior emulsion",
    "Eco-friendly, low VOC paints",
    "Complete masking & floor protection",
    "Post-job basic cleanup",
    "1-year warranty on chipping & flaking",
  ],
  "int-multi-room": [
    "Wall sanding & minor crack filling",
    "Double coat premium interior emulsion",
    "Eco-friendly, low VOC paints",
    "Complete masking & floor protection",
    "Post-job basic cleanup",
    "1-year warranty on chipping & flaking",
  ],
  "int-full-home": [
    "Wall sanding & minor crack filling",
    "Double coat premium interior emulsion",
    "Eco-friendly, low VOC paints",
    "Complete masking & floor protection",
    "Post-job basic cleanup",
    "1-year warranty on chipping & flaking",
  ],
  "int-ceiling": [
    "Ceiling sanding & crack repairs",
    "Double coat flat white ceiling paint",
    "Stain blocking primer (where needed)",
    "Complete furniture & floor masking",
  ],
  "interior-painting": [
    "Wall sanding & minor crack filling",
    "Double coat premium interior emulsion",
    "Eco-friendly, low VOC paints",
    "Complete masking & floor protection",
    "Post-job basic cleanup",
    "1-year warranty on chipping & flaking",
  ],
  "paint-interior": [
    "Wall sanding & minor crack filling",
    "Double coat premium interior emulsion",
    "Eco-friendly, low VOC paints",
    "Complete masking & floor protection",
    "Post-job basic cleanup",
    "1-year warranty on chipping & flaking",
  ],
  "ext-wall": [
    "Pressure washing & crack filling",
    "Anti-fungal primer coat",
    "Double coat weather-defense paint",
    "Dust and dirt resistant finish",
    "Complete scaffolding & safety protocols",
    "3-year weather protection warranty",
  ],
  "ext-building": [
    "Pressure washing & crack filling",
    "Anti-fungal primer coat",
    "Double coat weather-defense paint",
    "Dust and dirt resistant finish",
    "Complete scaffolding & safety protocols",
    "3-year weather protection warranty",
  ],
  "ext-compound": [
    "Pressure washing & crack filling",
    "Anti-fungal primer coat",
    "Double coat weather-defense paint",
    "Dust and dirt resistant finish",
    "Complete scaffolding & safety protocols",
    "3-year weather protection warranty",
  ],
  "ext-terrace": [
    "Pressure washing & crack filling",
    "Anti-fungal primer coat",
    "Double coat weather-defense paint",
    "Dust and dirt resistant finish",
    "Complete scaffolding & safety protocols",
    "3-year weather protection warranty",
  ],
  "exterior-painting": [
    "Pressure washing & crack filling",
    "Anti-fungal primer coat",
    "Double coat weather-defense paint",
    "Dust and dirt resistant finish",
    "Complete scaffolding & safety protocols",
    "3-year weather protection warranty",
  ],
  "paint-exterior": [
    "Pressure washing & crack filling",
    "Anti-fungal primer coat",
    "Double coat weather-defense paint",
    "Dust and dirt resistant finish",
    "Complete scaffolding & safety protocols",
    "3-year weather protection warranty",
  ],
  "wp-terrace": [
    "Surface cleaning & patch repairs",
    "Crack filling & waterproofing base coat",
    "Double coat elastomeric waterproofing membrane",
    "Prevents wall dampness & paint peeling",
    "2-year leakage warranty",
  ],
  "wp-bathroom": [
    "Surface cleaning & patch repairs",
    "Crack filling & waterproofing base coat",
    "Double coat elastomeric waterproofing membrane",
    "Prevents wall dampness & paint peeling",
    "2-year leakage warranty",
  ],
  "wp-wall": [
    "Surface cleaning & patch repairs",
    "Crack filling & waterproofing base coat",
    "Double coat elastomeric waterproofing membrane",
    "Prevents wall dampness & paint peeling",
    "2-year leakage warranty",
  ],
  "wp-roof": [
    "Surface cleaning & patch repairs",
    "Crack filling & waterproofing base coat",
    "Double coat elastomeric waterproofing membrane",
    "Prevents wall dampness & paint peeling",
    "2-year leakage warranty",
  ],
  "wp-crack": [
    "V-groove crack widening",
    "Polymer-modified crack filler application",
    "Reinforcing fiber mesh (for deep cracks)",
    "Sanding & leveling smooth surface",
  ],
  "waterproofing": [
    "Surface cleaning & patch repairs",
    "Crack filling & waterproofing base coat",
    "Double coat elastomeric waterproofing membrane",
    "Prevents wall dampness & paint peeling",
    "2-year leakage warranty",
  ],
  "paint-waterproofing": [
    "Surface cleaning & patch repairs",
    "Crack filling & waterproofing base coat",
    "Double coat elastomeric waterproofing membrane",
    "Prevents wall dampness & paint peeling",
    "2-year leakage warranty",
  ],
  "waterproof-coating": [
    "Surface cleaning & patch repairs",
    "Crack filling & waterproofing base coat",
    "Double coat elastomeric waterproofing membrane",
    "Prevents wall dampness & paint peeling",
    "2-year leakage warranty",
  ],
  "wm-doors": [
    "Rust removal & sanding treatment",
    "Specialized wood/metal primer application",
    "PU coating or premium enamel paint",
    "High gloss or sophisticated matte finish",
  ],
  "wm-windows": [
    "Rust removal & sanding treatment",
    "Specialized wood/metal primer application",
    "PU coating or premium enamel paint",
    "High gloss or sophisticated matte finish",
  ],
  "wm-grills": [
    "Rust removal & sanding treatment",
    "Specialized wood/metal primer application",
    "PU coating or premium enamel paint",
    "High gloss or sophisticated matte finish",
  ],
  "wm-cabinets": [
    "Rust removal & sanding treatment",
    "Specialized wood/metal primer application",
    "PU coating or premium enamel paint",
    "High gloss or sophisticated matte finish",
  ],
  "wm-gates": [
    "Rust removal & sanding treatment",
    "Specialized wood/metal primer application",
    "PU coating or premium enamel paint",
    "High gloss or sophisticated matte finish",
  ],
  "wood-metal": [
    "Rust removal & sanding treatment",
    "Specialized wood/metal primer application",
    "PU coating or premium enamel paint",
    "High gloss or sophisticated matte finish",
  ],
  "paint-wood-metal": [
    "Rust removal & sanding treatment",
    "Specialized wood/metal primer application",
    "PU coating or premium enamel paint",
    "High gloss or sophisticated matte finish",
  ],
  "td-texture": [
    "Designer accent wall textures",
    "Premium metallic/non-metallic finishes",
    "Double coat base preparation",
    "Complete masking and protection",
    "Wide range of pattern options",
  ],
  "td-designer": [
    "Designer accent wall textures",
    "Premium metallic/non-metallic finishes",
    "Double coat base preparation",
    "Complete masking and protection",
    "Wide range of pattern options",
  ],
  "td-stencil": [
    "Designer accent wall textures",
    "Premium metallic/non-metallic finishes",
    "Double coat base preparation",
    "Complete masking and protection",
    "Wide range of pattern options",
  ],
  "td-accent": [
    "Designer accent wall textures",
    "Premium metallic/non-metallic finishes",
    "Double coat base preparation",
    "Complete masking and protection",
    "Wide range of pattern options",
  ],
  "texture-decor": [
    "Designer accent wall textures",
    "Premium metallic/non-metallic finishes",
    "Double coat base preparation",
    "Complete masking and protection",
    "Wide range of pattern options",
  ],
  "paint-texture": [
    "Designer accent wall textures",
    "Premium metallic/non-metallic finishes",
    "Double coat base preparation",
    "Complete masking and protection",
    "Wide range of pattern options",
  ],
  "texture-painting": [
    "Designer accent wall textures",
    "Premium metallic/non-metallic finishes",
    "Double coat base preparation",
    "Complete masking and protection",
    "Wide range of pattern options",
  ],
  "fridge-parent": [
    "Interior & exterior cleaning",
    "Shelves, trays & compartments cleaning",
    "Door seal & stain cleaning"
  ],
  "fridge-single": [
    "Interior & exterior cleaning",
    "Shelves, trays & compartments cleaning",
    "Door seal & stain cleaning"
  ],
  "fridge-double": [
    "Interior & exterior cleaning",
    "Shelves, trays & compartments cleaning",
    "Door seal & stain cleaning"
  ],
  "fridge-triple": [
    "Interior & exterior cleaning",
    "Shelves, trays & compartments cleaning",
    "Door seal & stain cleaning"
  ],
  "stove-parent": [
    "Stove / hob surface cleaning",
    "Burner & knob cleaning",
    "Grease & food stain removal"
  ],
  "stove-2b": [
    "Stove / hob surface cleaning",
    "Burner & knob cleaning",
    "Grease & food stain removal"
  ],
  "stove-3b": [
    "Stove / hob surface cleaning",
    "Burner & knob cleaning",
    "Grease & food stain removal"
  ],
  "stove-4b": [
    "Stove / hob surface cleaning",
    "Burner & knob cleaning",
    "Grease & food stain removal"
  ],
  "occ-basic": [
    "Kitchen tiles, floor & slab cleaning + Mopping",
    "Gas stove / hob cleaning",
    "Sink & under-sink cleaning",
    "Exhaust fan cleaning",
    "Windows & switchboards cleaning",
    "Cabinet exterior cleaning",
    "Dining table cleaning",
    "Utensil removal / rearrangement not included"
  ],
  "occ-deep": [
    "Includes everything in Basic, plus:",
    "Cabinet interior & exterior cleaning",
    "Exhaust fan deep cleaning",
    "Utensil removal & rearrangement"
  ],
  "empty-kitchen": [
    "Thorough degreasing of wall tiles, countertops, and exhaust fans",
    "Detailed cleaning of kitchen floors, windows, switchboards, and cabinets (exterior)",
    "Deep sanitization of sink and under-sink area (utensils removal not included)"
  ],
  "kitchen-tiles-slabs": [
    "Tile and slab cleaning: Remove oil and grease stains",
    "Degreases tiles & slabs and deep cleans grout for a fresh kitchen"
  ],
  "cabinet-trolley-clean": [
    "Interior & exterior cabinet wet-wiping & degreasing",
    "Removal of food residue, spills & accumulated oil layers",
    "Trolley tracks vacuuming, wiping & structural sanitization"
  ]
}

const STATIC_SERVICE_DETAIL_DATA = {
  "empty-kitchen": {
    tools: ["Specialized degreasing agents", "High-pressure floor scrubbers", "Microfiber detailing cloths", "Glass cleaning kits"],
    ready: ["Ensure the kitchen is completely empty of utensils and items", "Provide access to continuous water and power supply"],
    reviews: [{ name: "Meera R.", rating: "4.9", text: '"Perfect cleaning before we moved into our new apartment. Every corner was spotless."' }],
    faqs: [{ q: "Is utensil washing included?", a: "No, this service is specifically for empty kitchens and does not include utensil cleaning." }]
  },
  "kitchen-tiles-slabs": {
    tools: ["Heavy duty degreasers", "Grout scrubbing brushes", "Microfiber cleaning cloths", "High-pressure sprayers"],
    ready: ["Clear items from the kitchen counters", "Ensure access to water and power outlets"],
    reviews: [{ name: "Priya M.", rating: "5.0", text: '"Removed the stubborn oil stains from the tiles. Looks brand new!"' }],
    faqs: [{ q: "Will this remove old stains?", a: "Yes, our specialized degreasers are designed to lift and clean tough oil and grease stains from slabs and tiles." }]
  },
  "cabinet-trolley-clean": {
    tools: ["Wood-safe cleaner & polish", "Stainless steel degreaser for rails", "Soft detailing brushes", "Lint-free microfibers"],
    ready: ["Empty all utensils and stored items from cabinets", "Ensure access to a water connection"],
    reviews: [{ name: "Suresh V.", rating: "4.9", text: '"They cleaned every trolley track and got rid of the sticky grease inside the cabinets."' }],
    faqs: [{ q: "Do I need to empty the cabinets?", a: "Yes, please empty all cabinets and drawers before the team arrives." }]
  },
  "occ-basic": {
    tools: ["Kitchen-safe degreasers", "Microfiber cloths", "Non-abrasive scrubbers", "Detail cleaning brushes", "Floor and surface cleaning tools"],
    ready: ["Continuous water supply", "Working power connection", "Kitchen area accessible for cleaning", "Fragile items and valuables kept safely"],
    reviews: [
      { name: "Ananya S.", rating: "5.0", text: '"The kitchen was cleaned very neatly. The stove, sink and tiles looked fresh after the service."' },
      { name: "Rahul K.", rating: "4.8", text: '"Good service for regular kitchen cleaning. The team was quick and professional."' }
    ],
    faqs: [
      { q: "Will you move utensils from the cabinets?", a: "No. Utensil removal and rearrangement are not included in the Basic package." },
      { q: "Do I need to provide cleaning products?", a: "No. Our professionals bring all the required environment-friendly cleaning tools and products." },
      { q: "Is chimney cleaning included in the Basic package?", a: "No. Chimney cleaning can be booked separately under Single Appliance & Specific Area Cleaning." },
      { q: "Can I add appliance cleaning to this package?", a: "Yes. You can add individual appliance cleaning as an additional service." },
      { q: "How long does the service take?", a: "The Basic package takes approximately 2 hours, depending on the kitchen size and condition." },
      { q: "Do you clean the exhaust fan in basic cleaning?", a: "No, exhaust fan cleaning is part of our deep cleaning package or can be booked separately as a quick service." },
      { q: "Will you clean tiles and grout?", a: "Yes, we wipe tiles and slabs to remove superficial oil stains, but deep scrubbing grout lines is part of the deep cleaning package." },
      { q: "Is garbage disposal included?", a: "We collect all waste generated during the cleaning and hand it over to your society bin, but we do not discard pre-existing bulk trash." }
    ]
  },
  "occ-deep": {
    tools: ["Steam cleaning equipment", "Kitchen-safe degreasers", "Microfiber cloths", "Non-abrasive scrubbers", "Detail brushes for corners and cabinets"],
    ready: ["Continuous water supply", "Working power connection", "Kitchen area accessible for cleaning", "Fragile items and valuables kept safely"],
    reviews: [
      { name: "Priya R.", rating: "5.0", text: '"Excellent deep cleaning. The grease on the stove and tiles was removed, and the cabinets were cleaned properly."' },
      { name: "Karthik M.", rating: "4.9", text: '"Very thorough service. They cleaned areas that are usually difficult to reach."' }
    ],
    faqs: [
      { q: "Does Deep Clean include everything in Basic?", a: "Yes. Deep Clean includes all services covered in the Basic package, along with additional deep-cleaning services." },
      { q: "Will you remove and rearrange utensils?", a: "Yes. Utensils can be removed, cabinets cleaned internally, and utensils rearranged as part of the Deep Clean service." },
      { q: "Does Deep Clean include chimney cleaning?", a: "No. Chimney cleaning is available separately under Single Appliance & Specific Area Cleaning." },
      { q: "Can I add refrigerator or microwave cleaning?", a: "Yes. Individual appliance cleaning can be added separately to your booking." },
      { q: "Does steam cleaning remove tough grease?", a: "Yes. Steam cleaning helps loosen and remove stubborn grease, oil buildup and stains from suitable kitchen surfaces." },
      { q: "How long does the service take?", a: "The Deep Clean package takes approximately 3 hours, depending on the kitchen size and condition." },
      { q: "Do you clean internal cabinet walls?", a: "Yes, we deep clean both the interiors and exteriors of all kitchen cabinets and drawers." },
      { q: "Are window panes and grills cleaned in this package?", a: "Yes, deep cleaning includes cleaning of kitchen window panes, frames, exhaust fans, and mesh surfaces." },
      { q: "Do you offer stain guarantee for old granite or tiles?", a: "While we use professional-grade degreasers and steam machines that remove 99% of grease, extremely old chemical etchings or stone discoloration may not disappear completely." }
    ]
  },
  "fridge-clean": {
    tools: ["Food-safe cleaning products", "Microfiber cloths", "Soft scrubbers", "Small cleaning brushes"],
    ready: ["Remove food items before cleaning", "Keep the refrigerator accessible", "Keep a power connection available"],
    reviews: [
      { name: "Ananya S.", rating: "5.0", text: '"Very neat cleaning. The shelves and inside of the fridge look fresh now."' },
      { name: "Rahul K.", rating: "4.8", text: '"Good service and the team handled everything carefully."' }
    ],
    faqs: [
      { q: "Do I need to remove the food?", a: "Yes, please remove all food items before cleaning." },
      { q: "Will you clean the freezer?", a: "Yes, accessible freezer areas will be cleaned." },
      { q: "Will you remove bad smell?", a: "We clean food stains and dirt that may cause unpleasant smells." }
    ]
  },
  "fridge-parent": {
    tools: ["Food-safe cleaning products", "Microfiber cloths", "Soft scrubbers", "Small cleaning brushes"],
    ready: ["Remove food items before cleaning", "Keep the refrigerator accessible", "Keep a power connection available"],
    reviews: [
      { name: "Ananya S.", rating: "5.0", text: '"Very neat cleaning. The shelves and inside of the fridge look fresh now."' },
      { name: "Rahul K.", rating: "4.8", text: '"Good service and the team handled everything carefully."' }
    ],
    faqs: [
      { q: "Do I need to remove the food?", a: "Yes, please remove all food items before cleaning." },
      { q: "Will you clean the freezer?", a: "Yes, accessible freezer areas will be cleaned." },
      { q: "Will you remove bad smell?", a: "We clean food stains and dirt that may cause unpleasant smells." }
    ]
  },
  "fridge-single": {
    tools: ["Food-safe cleaning products", "Microfiber cloths", "Soft scrubbers", "Small cleaning brushes"],
    ready: ["Remove food items before cleaning", "Keep the refrigerator accessible", "Keep a power connection available"],
    reviews: [
      { name: "Ananya S.", rating: "5.0", text: '"Very neat cleaning. The shelves and inside of the fridge look fresh now."' },
      { name: "Rahul K.", rating: "4.8", text: '"Good service and the team handled everything carefully."' }
    ],
    faqs: [
      { q: "Do I need to remove the food?", a: "Yes, please remove all food items before cleaning." },
      { q: "Will you clean the freezer?", a: "Yes, accessible freezer areas will be cleaned." },
      { q: "Will you remove bad smell?", a: "We clean food stains and dirt that may cause unpleasant smells." }
    ]
  },
  "fridge-double": {
    tools: ["Food-safe cleaning products", "Microfiber cloths", "Soft scrubbers", "Small cleaning brushes"],
    ready: ["Remove food items before cleaning", "Keep the refrigerator accessible", "Keep a power connection available"],
    reviews: [
      { name: "Ananya S.", rating: "5.0", text: '"Very neat cleaning. The shelves and inside of the fridge look fresh now."' },
      { name: "Rahul K.", rating: "4.8", text: '"Good service and the team handled everything carefully."' }
    ],
    faqs: [
      { q: "Do I need to remove the food?", a: "Yes, please remove all food items before cleaning." },
      { q: "Will you clean the freezer?", a: "Yes, accessible freezer areas will be cleaned." },
      { q: "Will you remove bad smell?", a: "We clean food stains and dirt that may cause unpleasant smells." }
    ]
  },
  "fridge-triple": {
    tools: ["Food-safe cleaning products", "Microfiber cloths", "Soft scrubbers", "Small cleaning brushes"],
    ready: ["Remove food items before cleaning", "Keep the refrigerator accessible", "Keep a power connection available"],
    reviews: [
      { name: "Ananya S.", rating: "5.0", text: '"Very neat cleaning. The shelves and inside of the fridge look fresh now."' },
      { name: "Rahul K.", rating: "4.8", text: '"Good service and the team handled everything carefully."' }
    ],
    faqs: [
      { q: "Do I need to remove the food?", a: "Yes, please remove all food items before cleaning." },
      { q: "Will you clean the freezer?", a: "Yes, accessible freezer areas will be cleaned." },
      { q: "Will you remove bad smell?", a: "We clean food stains and dirt that may cause unpleasant smells." }
    ]
  },
  "stove-parent": {
    tools: ["Stove-safe cleaning products", "Microfiber cloths", "Soft scrubbers", "Small cleaning brushes"],
    ready: ["Switch off the stove before cleaning", "Remove vessels and cookware", "Keep the stove area accessible"],
    reviews: [
      { name: "Ananya S.", rating: "5.0", text: '"The stove looks much cleaner and the grease was removed nicely."' },
      { name: "Rahul K.", rating: "4.9", text: '"Very good cleaning and the team was careful with the hob."' }
    ],
    faqs: [
      { q: "Will you clean the burners?", a: "Yes, the accessible burner areas will be cleaned." },
      { q: "Will you remove grease?", a: "Yes, oil, grease and food stains will be cleaned." },
      { q: "Do you repair gas stoves or hobs?", a: "No, repair work is not included." }
    ]
  },
  "stove-2b": {
    tools: ["Stove-safe cleaning products", "Microfiber cloths", "Soft scrubbers", "Small cleaning brushes"],
    ready: ["Switch off the stove before cleaning", "Remove vessels and cookware", "Keep the stove area accessible"],
    reviews: [
      { name: "Ananya S.", rating: "5.0", text: '"The stove looks much cleaner and the grease was removed nicely."' },
      { name: "Rahul K.", rating: "4.9", text: '"Very good cleaning and the team was careful with the hob."' }
    ],
    faqs: [
      { q: "Will you clean the burners?", a: "Yes, the accessible burner areas will be cleaned." },
      { q: "Will you remove grease?", a: "Yes, oil, grease and food stains will be cleaned." },
      { q: "Do you repair gas stoves or hobs?", a: "No, repair work is not included." }
    ]
  },
  "stove-3b": {
    tools: ["Stove-safe cleaning products", "Microfiber cloths", "Soft scrubbers", "Small cleaning brushes"],
    ready: ["Switch off the stove before cleaning", "Remove vessels and cookware", "Keep the stove area accessible"],
    reviews: [
      { name: "Ananya S.", rating: "5.0", text: '"The stove looks much cleaner and the grease was removed nicely."' },
      { name: "Rahul K.", rating: "4.9", text: '"Very good cleaning and the team was careful with the hob."' }
    ],
    faqs: [
      { q: "Will you clean the burners?", a: "Yes, the accessible burner areas will be cleaned." },
      { q: "Will you remove grease?", a: "Yes, oil, grease and food stains will be cleaned." },
      { q: "Do you repair gas stoves or hobs?", a: "No, repair work is not included." }
    ]
  },
  "stove-4b": {
    tools: ["Stove-safe cleaning products", "Microfiber cloths", "Soft scrubbers", "Small cleaning brushes"],
    ready: ["Switch off the stove before cleaning", "Remove vessels and cookware", "Keep the stove area accessible"],
    reviews: [
      { name: "Ananya S.", rating: "5.0", text: '"The stove looks much cleaner and the grease was removed nicely."' },
      { name: "Rahul K.", rating: "4.9", text: '"Very good cleaning and the team was careful with the hob."' }
    ],
    faqs: [
      { q: "Will you clean the burners?", a: "Yes, the accessible burner areas will be cleaned." },
      { q: "Will you remove grease?", a: "Yes, oil, grease and food stains will be cleaned." },
      { q: "Do you repair gas stoves or hobs?", a: "No, repair work is not included." }
    ]
  },
  "kitchen-microwave-clean": {
    tools: ["Appliance-safe cleaning products", "Microfiber cloths", "Soft scrubbers", "Small cleaning brushes"],
    ready: ["Remove food and containers", "Keep the microwave accessible", "Ensure the appliance is switched off"],
    reviews: [
      { name: "Priya R.", rating: "5.0", text: '"The inside of my microwave was cleaned really well."' },
      { name: "Karthik M.", rating: "4.9", text: '"Quick and neat service. The food stains were removed properly."' }
    ],
    faqs: [
      { q: "Will you clean the inside of the microwave?", a: "Yes, the inside, glass door and rotating plate will be cleaned." },
      { q: "Do I need to remove everything before cleaning?", a: "Yes, please remove food and containers before the service." },
      { q: "Can you remove burnt food stains?", a: "We will clean removable food and grease stains." }
    ]
  },
  "chimney-clean": {
    tools: ["Grease-removing cleaning products", "Microfiber cloths", "Soft scrubbers", "Cleaning brushes"],
    ready: ["Keep the chimney area accessible", "Clear items around the stove", "Ensure a power connection is available"],
    reviews: [
      { name: "Karthik M.", rating: "5.0", text: '"The grease on my chimney filter was cleaned properly."' },
      { name: "Ananya S.", rating: "4.8", text: '"Good cleaning service. The chimney looks much cleaner now."' }
    ],
    faqs: [
      { q: "Will you clean the chimney filter?", a: "Yes, the chimney filter will be cleaned." },
      { q: "Will you remove grease and oil?", a: "Yes, visible grease and oil buildup will be cleaned." },
      { q: "Do you repair the chimney?", a: "No, repair and replacement work are not included." }
    ]
  },
  "dishwasher-clean": {
    tools: ["Dishwasher-safe cleaning products", "Microfiber cloths", "Soft scrubbers", "Small cleaning brushes"],
    ready: ["Remove all dishes before cleaning", "Keep the dishwasher accessible", "Keep water and power connections available"],
    reviews: [
      { name: "Priya R.", rating: "5.0", text: '"The dishwasher was cleaned very neatly, especially the racks and filter."' },
      { name: "Karthik M.", rating: "4.8", text: '"Good service and the inside looks much cleaner now."' }
    ],
    faqs: [
      { q: "Will you clean the filter?", a: "Yes, the accessible filter will be cleaned." },
      { q: "Do I need to remove the dishes?", a: "Yes, please empty the dishwasher before cleaning." },
      { q: "Will you remove food waste and dirt?", a: "Yes, visible food waste and dirt will be cleaned." }
    ]
  },
  "air-fryer-clean": {
    tools: ["Food-safe interior sanitizers", "Microfiber cloths", "Detail cleaning brushes"],
    ready: ["Keep the air fryer accessible and unplugged", "Ensure power outlet is nearby for testing"],
    reviews: [{ name: "Meera V.", rating: "5.0", text: '"Very neat cleaning. The tray oil and food residues were completely washed."' }],
    faqs: [{ q: "Is the cleaner safe for non-stick coating?", a: "Yes, we use non-abrasive soft sponges and mild, food-safe cleaners that protect the non-stick coating." }]
  },
  "otg-clean": {
    tools: ["OTG safe degreasers", "Microfiber cleaning cloths", "Crevice cleaning brushes"],
    ready: ["Unplug the OTG and keep it accessible", "Empty any trays or racks inside"],
    reviews: [{ name: "Siddharth N.", rating: "4.9", text: '"Removed all grease stains from the glass door and walls. Excellent OTG service!"' }],
    faqs: [{ q: "Will this clean the heating elements?", a: "We clean around heating elements carefully to avoid damage, removing grease from the oven interior walls, glass door, and trays." }]
  },
  "sandwich-clean": {
    tools: ["Food-safe surface wipes", "Detangled cleaning brushes"],
    ready: ["Keep the sandwich maker/griller accessible and unplugged"],
    reviews: [{ name: "Deepa K.", rating: "4.8", text: '"Quick and efficient. Removed the dark stuck food particles from the grill plates."' }],
    faqs: [{ q: "Will this clean stuck cheese?", a: "Yes, we use safe scrapers and warm chemical wipes to dissolve and remove cheese and char residues." }]
  },
  "quick-sink-under-sink": {
    tools: ["Scrubbing brushes", "Disinfectant sanitizers", "Odour removal sprays"],
    ready: ["Clear any vessels from the sink before the professional arrives"],
    reviews: [
      { name: "Kunal T.", rating: "4.9", text: '"The sink shines like new, and the under-sink smell is totally gone."' },
      { name: "Ritu G.", rating: "4.8", text: '"Great scrubbing work on the hard water stains in the sink."' }
    ],
    faqs: [{ q: "Do you clean the drain pipe?", a: "We clean the external sink drain area and visible parts. We do not do plumbing repairs or unclogging." }]
  },
  "quick-kitchen-window": {
    tools: ["Glass squeegee", "Grease-cutting window spray", "Track cleaning brush"],
    ready: ["Clear the window sill and counter space below the window"],
    reviews: [{ name: "Vikram J.", rating: "4.8", text: '"Amazing job removing sticky cooking oil residue from the window glass."' }],
    faqs: [{ q: "Will you clean the window mesh?", a: "Yes, we brush and wipe the window mesh to remove dust." }]
  },
  "quick-dining-table": {
    tools: ["Food-safe table cleaner", "Polishing cloth"],
    ready: ["Clear dishes and table mats before service"],
    reviews: [{ name: "Arjun V.", rating: "5.0", text: '"Got rid of sticky grease stains on the glass tabletop. Super clean!"' }],
    faqs: [{ q: "Will you polish wooden tables?", a: "We do standard cleaning and gentle wiping. Specialized wood polishing is not included." }]
  },
  "quick-fan-clean": {
    tools: ["Microfiber cloths", "All-purpose cleaning spray", "Sturdy step ladder"],
    ready: ["Keep the space below the fan clear", "Ensure the fan switch is turned off"],
    reviews: [
      { name: "Amit S.", rating: "4.9", text: '"The fan was covered in sticky kitchen grease, but they got it completely clean."' },
      { name: "Neha P.", rating: "4.8", text: '"Fast and efficient fan cleaning service."' }
    ],
    faqs: [
      { q: "Does this include repair?", a: "No, this is only a cleaning service. No repairs are done." },
      { q: "Will my floor get dirty?", a: "Our professionals use dust-drop cloths to protect your floor." }
    ]
  },
  "quick-exhaust-fan-clean": {
    tools: ["Microfiber cloths", "Soft cleaning brushes", "Grease-removing cleaning solution", "Long-reach dusting tools"],
    ready: ["Switch off the exhaust fan before cleaning", "Keep the area around the fan clear", "Provide safe access to the fan"],
    reviews: [
      { name: "Ananya S.", rating: "5.0", text: '"The exhaust fan had a lot of dust and grease. It was cleaned very neatly."' },
      { name: "Rahul K.", rating: "4.8", text: '"Quick service and the fan looks much cleaner now."' }
    ],
    faqs: [
      { q: "Will you clean the fan blades?", a: "Yes, the accessible fan blades will be cleaned properly." },
      { q: "Will you clean the cover / grill?", a: "Yes, the fan cover and visible grill will also be cleaned." },
      { q: "Will you remove grease from the fan?", a: "Yes, normal dust, grease and dirt buildup will be cleaned." },
      { q: "Will you remove the exhaust fan from the wall?", a: "No, the fan will be cleaned while it remains installed." },
      { q: "Do you repair exhaust fans?", a: "No, electrical, motor and wiring repairs are not included." }
    ]
  },
  "quick-balcony-upto-4ft": {
    tools: ["Heavy duty floor brush", "High-pressure water source if available", "Balcony cleaning detergent"],
    ready: ["Clear planters or light furniture from the balcony floor", "Provide access to a water tap"],
    reviews: [{ name: "Sneha L.", rating: "5.0", text: '"Balcony floor is sparkling clean. They washed off all the pigeon droppings."' }],
    faqs: [{ q: "Do you clean the balcony roof?", a: "No, roof or ceiling cleaning is not included in this quick package." }]
  },
  "quick-balcony-above-4ft": {
    tools: ["Scrubbing brushes & wipers", "Balcony floor wash detergent", "Cobweb removal brush"],
    ready: ["Clear all furniture and items from the balcony"],
    reviews: [{ name: "Manish P.", rating: "4.9", text: '"Very thorough washing. Highly recommend for large balconies."' }],
    faqs: [{ q: "Will you clean glass railings?", a: "Yes, both sides of glass railings are cleaned if safely accessible." }]
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
      { q: "Do I need to provide cleaning products?", a: "No. Our team brings the required cleaning products and equipment." }
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
      { q: "Can the sofa be used immediately?", a: "Some drying time may be required after cleaning." }
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
      { q: "Can you clean all types of leather?", a: "We clean commonly used finished leather surfaces. Special or delicate leather may require an additional assessment." }
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
      { q: "Will the leather become shiny after cleaning?", a: "The conditioning and finishing treatment gives the leather a clean and well-maintained appearance." }
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
      { q: "Do I need to remove the bedsheets?", a: "Yes, please remove bedsheets, blankets and other items before the service." }
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
      { q: "How long does the mattress take to dry?", a: "Drying time depends on room ventilation, usually takes a few hours." }
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
      { q: "Do I need to clear furniture before cleaning?", a: "Yes, please remove tables, chairs, and other items from the carpet before the service." }
    ]
  },
  "quick-door-clean": {
    tools: [
      "Wiping cloths",
      "Door polish / disinfectant spray"
    ],
    ready: [
      "Keep doors clear and accessible for wiping"
    ],
    reviews: [
      { name: "Deepak S.", rating: "4.8", text: '"Good dusting and fingerprint removal from the doors."' }
    ],
    faqs: [
      { q: "Do you clean the door frames?", a: "Yes, we clean both panels and frames." }
    ]
  },
  "pest-kb-main": {
    tools: [
      "Professional pest control equipment",
      "Approved pest treatment solutions",
      "Targeted gel bait application"
    ],
    ready: [
      "Keep food items covered",
      "Store utensils safely after clearing"
    ],
    reviews: [
      { name: "Rajesh K.", rating: "5.0", text: '"Excellent service. The technician cleared the utensils carefully and put gel in all hinges."' },
      { name: "Anjali S.", rating: "4.0", text: '"Very professional. The treatment is odorless and highly effective."' }
    ],
    faqs: [
      { q: "Is the treatment safe for kids and pets?", a: "Yes, we use government-approved odorless chemicals that are completely safe. However, we recommend keeping them away during active spraying." },
      { q: "Do you clear the utensils?", a: "Before the inspection and treatment, our technician will assist in removing the utensils. After treatment, the customer is requested to put them back." },
      { q: "How long does a session take?", a: "Typically, a kitchen cockroach treatment takes about 45min." },
      { q: "How quickly do cockroaches die?", a: "You will start seeing a significant reduction within 48 hours, and complete elimination of active roaches in 1 day." },
      { q: "Do I need to leave the house?", a: "It is not required to leave the house." },
      { q: "Does the spray stain cabinets?", a: "No, our water-based chemicals are non-staining and odorless, making them safe for wooden, laminate, and steel modular kitchens." }
    ]
  },
  "pest-apt-main": {
    tools: [
      "Professional pest control equipment",
      "Approved pest treatment solutions",
      "Targeted gel bait application"
    ],
    ready: [
      "Keep food items covered",
      "Store utensils safely after clearing"
    ],
    reviews: [
      { name: "Vikram M.", rating: "5.0", text: '"Roach problem resolved completely. Best service ever."' },
      { name: "Neha G.", rating: "5.0", text: '"Awesome odorless spray. They handled the kitchen prep too."' }
    ],
    faqs: [
      { q: "How long does the effect last?", a: "The treatment prevents pest return for up to 90 days. A second visit at 14 days is included to ensure complete eradication." },
      { q: "Is pre-cleaning of the rooms required?", a: "No, but clearing toys, clothes, and loose items from skirting boards helps the partner spray more efficiently." },
      { q: "Does this spray have a strong chemical smell?", a: "No, we use premium water-soluble odorless chemical sprays that leave no foul scent behind." },
      { q: "What should I do after the treatment?", a: "Keep ventilation open for 15 minutes, avoid wet wiping the skirting boards for at least 48 hours so the chemical barrier stays intact." },
      { q: "Do you treat electrical boxes?", a: "Yes, we use Eco-safe Herbal Gel bait instead of liquid spray inside electrical switch boards and sockets." },
      { q: "Are balcony areas covered in the apartment plan?", a: "Yes, balcony drains, washing areas, and main entry doors are sprayed to block external entry points." },
      { q: "What chemicals do you use?", a: "We use only government-approved, low-toxicity synthetic pyrethroids which are highly target-specific for insects." },
      { q: "Is there any preparation for pet food bowls?", a: "Yes, please remove and store all pet food bowls and water bowls before our technician begins the spray." }
    ]
  },
  "pest-bung-main": {
    tools: [
      "Professional pest control equipment",
      "Approved pest treatment solutions",
      "Targeted gel bait application"
    ],
    ready: [
      "Keep food items covered",
      "Store utensils safely after clearing"
    ],
    reviews: [
      { name: "Suresh P.", rating: "4.0", text: '"Detailed inspection and gel application. Highly recommended."' }
    ],
    faqs: [
      { q: "Do you cover all floors of the bungalow?", a: "Yes, we treat all rooms, staircase areas, terraces, and external verandas." },
      { q: "How long does a bungalow cockroach treatment take?", a: "It takes about 1.5 to 2.5 hours depending on the total floor count and rooms." },
      { q: "Do you treat external drainage chambers?", a: "Yes, external manholes and drain chambers are treated with chemical sprays to prevent entry from the drainage system." },
      { q: "Is garden area spraying included?", a: "No, this is an indoor-focused treatment. However, we spray immediate porches, verandas, and outer door frames." },
      { q: "Can we clean the house immediately after treatment?", a: "You can sweep, but avoid washing or mopping along skirting boards for 2 to 3 days to maximize residual action." },
      { q: "What type of gel do you use?", a: "We use advanced fipronil/imidacloprid gels which act as highly palatable bait for roaches." },
      { q: "What is the warranty period for bungalows?", a: "We provide a 90-day complete protection warranty from the date of the first service." },
      { q: "How many partners are sent for a bungalow?", a: "Usually 1 to 2 trained service partners are assigned depending on the size of the duplex/villa." }
    ]
  },
  "pest-termite-kb": {
    tools: [
      "Professional pest control equipment",
      "Approved pest treatment solutions",
      "Targeted gel bait application"
    ],
    ready: [
      "Keep food items covered",
      "Store utensils safely after clearing"
    ],
    reviews: [
      { name: "Mahesh S.", rating: "5.0", text: '"Excellent termite control. Wood cabinets are completely safe now."' }
    ],
    faqs: [
      { q: "Does the drilling damage walls?", a: "No, we use fine-tip drills and seal the holes cleanly with color-matched cement/putty." },
      { q: "What chemicals do you use for termites?", a: "We use premium termiticides containing imidacloprid or fipronil, which create a chemical barrier to block and destroy termites." },
      { q: "Is termite treatment odorless?", a: "Yes, the chemical solutions are completely odorless and do not cause any respiratory discomfort." },
      { q: "How deep do you drill?", a: "We drill about 4 to 6 inches deep into the base of walls at regular intervals to inject chemicals into the foundation." },
      { q: "Can termites return after drilling?", a: "Our treatment kills the existing infestation and prevents return. We offer a long-term warranty to secure your kitchen wood structures." },
      { q: "Do I need to empty my kitchen cabinets?", a: "Yes, emptying cabinets in the treatment zone is required so we can access and inject chemicals behind the wood ply." },
      { q: "How long does this termite treatment take?", a: "It takes about 2 to 3 hours depending on the number of bathrooms and kitchen cabinets treated." },
      { q: "Does it kill termite eggs?", a: "Termiticide is a systemic chemical. Termites carry it back to their colony, which leads to total colony elimination, including eggs." }
    ]
  },
  "pest-termite-apt": {
    tools: [
      "Professional pest control equipment",
      "Approved pest treatment solutions",
      "Targeted gel bait application"
    ],
    ready: [
      "Keep food items covered",
      "Store utensils safely after clearing"
    ],
    reviews: [
      { name: "Karan T.", rating: "5.0", text: '"Professional termite drilling. They gave a 5-year warranty certificate."' }
    ],
    faqs: [
      { q: "What does the 5-year warranty cover?", a: "If termites reappear anywhere in the treated zones within 5 years, we will re-treat the area completely free of charge." },
      { q: "Is the entire apartment treated in this plan?", a: "Yes, we drill and inject termiticide along the floor-wall junctions of all rooms in the apartment." },
      { q: "How safe is the chemical inside rooms?", a: "The termiticide is injected deep inside the walls and sealed, so there is no chemical exposure to children or pets." },
      { q: "Do we need to vacate the house during treatment?", a: "No, there is no need to vacate as the service is clean, non-toxic, and odorless." },
      { q: "Will the drill noise disturb neighbors?", a: "There will be drill noises during the first 1-2 hours. We recommend informing neighbors beforehand." },
      { q: "How do you seal the drilled holes?", a: "We fill the holes with white cement mixed with wall putty, smoothing them out so they blend with your floor trim." },
      { q: "Does this cover wooden wardrobes?", a: "Yes, we spray anti-termite chemicals on the back boards and frames of all fixed wooden wardrobes." },
      { q: "Can we clean floors after termite drilling?", a: "You can mop the center of the rooms immediately. Avoid washing wall-floor junctions for 24 hours." }
    ]
  },
  "pest-termite-bung": {
    tools: [
      "Professional pest control equipment",
      "Approved pest treatment solutions",
      "Targeted gel bait application"
    ],
    ready: [
      "Keep food items covered",
      "Store utensils safely after clearing"
    ],
    reviews: [
      { name: "Pooja V.", rating: "5.0", text: '"Very thorough treatment. They spent hours securing our duplex. Great service!"' }
    ],
    faqs: [
      { q: "Do we need to vacate the bungalow?", a: "No vacation needed. The chemicals are safe and completely odorless." },
      { q: "What does the bungalow termite plan cover?", a: "It covers drilling and chemical injection of all levels of the bungalow, wardrobe backboards, and soil barrier misting around the duplex perimeter." },
      { q: "How long does a bungalow termite service take?", a: "A complete bungalow service takes about 4 to 6 hours depending on the size." },
      { q: "Is external soil treatment included?", a: "Yes, we spray the soil borders around the bungalow's foundation to prevent termites from migrating inside." },
      { q: "What is the warranty period?", a: "We provide a 5-year warranty with a physical certificate for the bungalow termite treatment." },
      { q: "Do you treat wooden staircases?", a: "Yes, wooden stair casings and railings are carefully injected and sprayed to protect them." },
      { q: "How many technicians are sent?", a: "Usually 2 to 3 trained professionals equipped with heavy hammer drills and high-pressure chemical pumps." },
      { q: "What happens if termites appear in my furniture?", a: "During the 5-year warranty, if any termites emerge in treated structures, contact us and we will re-inject them at no extra cost." }
    ]
  }
}

const EMPTY_PACKAGE = {
  service: "",
  name: "",
  slug: "",
  description: "",
  base_price: "",
  duration: "",
  image: "",
  popular: false,
  tag: "",
  includes: "",
  excludes: "",
  payment_policy: "BOTH",
}

const STATUS_TONE = {
  DRAFT: "bg-slate-100 text-slate-600 border-slate-200",
  ACTIVE: "bg-blue-50 text-blue-700 border-blue-200/70",
  INACTIVE: "bg-amber-50 text-amber-700 border-amber-200/70",
  ARCHIVED: "bg-rose-50 text-rose-700 border-rose-200/70",
}

const NEXT_STATUSES = {
  DRAFT: ["ACTIVE"],
  ACTIVE: ["INACTIVE"],
  INACTIVE: ["ACTIVE"],
}

// 7 Core Specialized Service Pillars Configuration in Bluish / Indigo Theme
const CORE_PILLARS = [
  {
    key: "home_pest_control",
    shortName: "Home & Pest Control",
    fullName: "Home Cleaning & Pest Control",
    icon: Sparkles,
    accentColor: "indigo",
    activeClass: "bg-indigo-600 text-white shadow-md shadow-indigo-600/25 border-indigo-600",
    badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200/80",
    headerBg: "bg-gradient-to-r from-blue-50/80 to-indigo-50/50",
    iconBg: "bg-indigo-50 border-indigo-200 text-indigo-700",
  },
  {
    key: "goods_transports",
    shortName: "Goods & Logistics",
    fullName: "Goods & Transport Logistics",
    icon: Truck,
    accentColor: "blue",
    activeClass: "bg-indigo-600 text-white shadow-md shadow-indigo-600/25 border-indigo-600",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200/80",
    headerBg: "bg-gradient-to-r from-blue-50/80 to-indigo-50/50",
    iconBg: "bg-blue-50 border-blue-200 text-blue-700",
  },
  {
    key: "electrician_plumbing_carpentry",
    shortName: "Electrical, Plumbing & Carpentry",
    fullName: "Electrical, Plumbing & Carpentry Services",
    icon: Wrench,
    accentColor: "blue",
    activeClass: "bg-indigo-600 text-white shadow-md shadow-indigo-600/25 border-indigo-600",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200/80",
    headerBg: "bg-gradient-to-r from-blue-50/80 to-indigo-50/50",
    iconBg: "bg-blue-50 border-blue-200 text-blue-700",
  },
  {
    key: "ac_appliance",
    shortName: "AC & Appliances",
    fullName: "AC & Appliance Repair Solutions",
    icon: Wind,
    accentColor: "sky",
    activeClass: "bg-indigo-600 text-white shadow-md shadow-indigo-600/25 border-indigo-600",
    badgeClass: "bg-sky-50 text-sky-700 border-sky-200/80",
    headerBg: "bg-gradient-to-r from-sky-50/80 to-blue-50/50",
    iconBg: "bg-sky-50 border-sky-200 text-sky-700",
  },
  {
    key: "paintings",
    shortName: "Painting & Waterproofing",
    fullName: "Painting, Wall Care & Waterproofing",
    icon: Palette,
    accentColor: "purple",
    activeClass: "bg-indigo-600 text-white shadow-md shadow-indigo-600/25 border-indigo-600",
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200/80",
    headerBg: "bg-gradient-to-r from-purple-50/80 to-blue-50/50",
    iconBg: "bg-purple-50 border-purple-200 text-purple-700",
  },
  {
    key: "mason",
    shortName: "Masonry & Construction",
    fullName: "Civil Works & Masonry Construction",
    icon: Hammer,
    accentColor: "amber",
    activeClass: "bg-indigo-600 text-white shadow-md shadow-indigo-600/25 border-indigo-600",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200/80",
    headerBg: "bg-gradient-to-r from-amber-50/80 to-blue-50/50",
    iconBg: "bg-amber-50 border-amber-200 text-amber-700",
  },
  {
    key: "vegetables_groceries",
    shortName: "Groceries & Fresh Produce",
    fullName: "Farm-Fresh Groceries & Daily Produce",
    icon: Carrot,
    accentColor: "blue",
    activeClass: "bg-indigo-600 text-white shadow-md shadow-indigo-600/25 border-indigo-600",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200/80",
    headerBg: "bg-gradient-to-r from-blue-50/80 to-indigo-50/50",
    iconBg: "bg-blue-50 border-blue-200 text-blue-700",
  },
]

// Dynamic Icon resolver for sub-services
const getServiceIcon = (slug = "", name = "") => {
  const s = (slug + " " + name).toLowerCase()
  if (s.includes("two-wheeler") || s.includes("2-wheeler") || s.includes("2 wheeler") || s.includes("bike")) return Bike
  if (s.includes("truck") || s.includes("pickup") || s.includes("ace")) return Truck
  if (s.includes("packer") || s.includes("mover") || s.includes("relocation") || s.includes("shifting")) return Boxes
  if (s.includes("electr") || s.includes("socket") || s.includes("switch") || s.includes("wire") || s.includes("fan")) return Zap
  if (s.includes("plumb") || s.includes("tap") || s.includes("faucet") || s.includes("sink") || s.includes("drain")) return Droplets
  if (s.includes("carpenter") || s.includes("carpentry") || s.includes("lock") || s.includes("door") || s.includes("furnit") || s.includes("drill")) return Hammer
  if (s.includes("clean") || s.includes("sofa") || s.includes("bathroom") || s.includes("kitchen") || s.includes("house")) return Sparkles
  if (s.includes("pest") || s.includes("cockroach") || s.includes("termite") || s.includes("ant") || s.includes("bug")) return ShieldCheck
  if (s.includes("ac") || s.includes("air") || s.includes("hvac") || s.includes("wind") || s.includes("cool")) return Wind
  if (s.includes("appliance") || s.includes("refriger") || s.includes("geyser") || s.includes("oven") || s.includes("tv") || s.includes("washing")) return Box
  if (s.includes("paint") || s.includes("waterproof") || s.includes("decor") || s.includes("putty")) return Palette
  if (s.includes("mason") || s.includes("brick") || s.includes("plaster") || s.includes("wall") || s.includes("construct")) return Hammer
  if (s.includes("vegetable") || s.includes("veggie")) return Carrot
  if (s.includes("grocer") || s.includes("staple") || s.includes("dal")) return ShoppingBag
  return Layers
}

export function CatalogPackagesPage() {
  const [categories, setCategories] = useState([])
  const [services, setServices] = useState([])
  const [packages, setPackages] = useState([])
  const [activeCategoryKey, setActiveCategoryKey] = useState("goods_transports")
  const [activeSubServiceKey, setActiveSubServiceKey] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [quickPriceEditing, setQuickPriceEditing] = useState(null)
  const [newItemText, setNewItemText] = useState("")
  const [serviceEditing, setServiceEditing] = useState(null)
  const [expandedPackages, setExpandedPackages] = useState(new Set())
  const [toast, showToast] = useToast()
  const [serviceCustomizing, setServiceCustomizing] = useState(null)
  const [customizerTab, setCustomizerTab] = useState("general")

  const loadData = async () => {
    setLoading(true)
    try {
      const [catRes, svcRes, pkgRes] = await Promise.all([
        apiRequest("/settings/catalog/v2/categories/"),
        apiRequest("/settings/catalog/v2/services/"),
        apiRequest("/settings/catalog/v2/packages/"),
      ])
      if (catRes && catRes.success) setCategories(catRes.data)
      if (svcRes && svcRes.success) setServices(svcRes.data)
      if (pkgRes && pkgRes.success) setPackages(pkgRes.data)
      // Warn if any response indicates failure
      if (!catRes?.success || !svcRes?.success || !pkgRes?.success) {
        console.warn("Catalog load partial failure:", { catRes, svcRes, pkgRes })
      }
    } catch (err) {
      console.error("Catalog load error:", err)
      showToast("Failed to load catalog data", "error")
    }
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  // Map category slug / id to matched DB category
  const categoryMap = useMemo(() => {
    const map = {}
    categories.forEach((cat) => {
      map[cat.slug] = cat
      map[String(cat.id)] = cat
    })
    return map
  }, [categories])

  // Active Category details
  const activePillar = useMemo(() => {
    const found = CORE_PILLARS.find((p) => p.key === activeCategoryKey) || CORE_PILLARS[1]
    const dbCat = categoryMap[activeCategoryKey]
    return {
      ...found,
      dbCategory: dbCat,
      name: dbCat?.name || found.fullName,
      description: dbCat?.description || "Directly customize service prices and vehicle fares across this pillar.",
    }
  }, [activeCategoryKey, categoryMap])

  // Sub-services and their packages under the active category
  const activeCategoryServicesWithPackages = useMemo(() => {
    const currentDbCat = categoryMap[activeCategoryKey]
    const catId = currentDbCat?.id

    // Find services belonging to this category
    let catServices = services.filter(
      (s) => (catId && String(s.category) === String(catId)) || (s.category_slug && s.category_slug === activeCategoryKey)
    )

    if (activeCategoryKey === "home_pest_control") {
      catServices = catServices.filter(
        (s) => s.slug !== "general" && s.slug !== "security" && s.slug !== "termite-control"
      )
    }

    if (catServices.length === 0 && currentDbCat) {
      catServices = services.filter((s) => s.category_id === catId || s.category === catId)
      if (activeCategoryKey === "home_pest_control") {
        catServices = catServices.filter(
          (s) => s.slug !== "general" && s.slug !== "security" && s.slug !== "termite-control"
        )
      }
    }

    // Goods & Transports specific ordering: 2 Wheeler, Truck, Packers & Movers
    if (activeCategoryKey === "goods_transports") {
      const order = { "two-wheeler": 1, "truck": 2, "packers-movers": 3 }
      catServices = [...catServices].sort((a, b) => {
        const orderA = order[a.slug] || 99
        const orderB = order[b.slug] || 99
        return orderA - orderB
      })
    }

    const q = searchQuery.trim().toLowerCase()

    // Map each service to its packages list
    const result = catServices.flatMap((svc) => {
      let allSvcPkgs = packages.filter((p) => {
        const pkgSvcId = p.service?.id || p.service || p.service_id
        return String(pkgSvcId) === String(svc.id)
      })

      if (svc.slug === "cockroach-control") {
        const termiteSvc = services.find(s => s.slug === "termite-control")
        const termitePkgs = termiteSvc
          ? packages.filter(p => String(p.service?.id || p.service || p.service_id) === String(termiteSvc.id))
          : []
        const seenIds = new Set(allSvcPkgs.map(p => p.id))
        const uniqueTermite = termitePkgs.filter(p => !seenIds.has(p.id))
        allSvcPkgs = [...allSvcPkgs, ...uniqueTermite]
      }

      if (svc.slug === "sofa-cleaning") {
        const addonPkgs = packages.filter((p) =>
          p.slug.startsWith("quick-") ||
          p.slug.startsWith("fridge-") ||
          p.slug.startsWith("sink-") ||
          p.slug.startsWith("dining-") ||
          p.slug.startsWith("fan-") ||
          p.slug.startsWith("balcony-")
        )
        const seenIds = new Set(allSvcPkgs.map(p => p.id))
        const uniqueAddons = addonPkgs.filter(p => !seenIds.has(p.id))
        allSvcPkgs = [...allSvcPkgs, ...uniqueAddons]
      }

      if (svc.slug === "bathroom-cleaning") {
        const extraPkgs = packages.filter((p) =>
          p.slug.startsWith("bath-") ||
          p.slug.startsWith("sub-")
        )
        const seenIds = new Set(allSvcPkgs.map(p => p.id))
        const uniqueExtras = extraPkgs.filter(p => !seenIds.has(p.id))
        allSvcPkgs = [...allSvcPkgs, ...uniqueExtras]
      }

      if (svc.slug === "full-house-cleaning" || svc.slug === "house-cleaning" || svc.slug === "full_house_cleaning") {
        const extraPkgs = packages.filter((p) =>
          p.slug.includes("-apt-") ||
          p.slug.includes("-bungalow-") ||
          p.slug.startsWith("unfurnished-") ||
          p.slug.startsWith("unoccupied-") ||
          p.slug.startsWith("quick-") ||
          p.slug.startsWith("window-") ||
          p.slug.includes("flat") ||
          p.slug.includes("house") ||
          p.slug === "kitchen-microwave-clean"
        )
        const seenIds = new Set(allSvcPkgs.map(p => p.id))
        const uniqueExtras = extraPkgs.filter(p => !seenIds.has(p.id))
        allSvcPkgs = [...allSvcPkgs, ...uniqueExtras]
      }

      // Custom sorting for Goods & Transports modules
      let sortedPkgs = allSvcPkgs
      if (svc.slug === "truck") {
        const truckOrder = { "1-7-ton": 1, "3-wheeler": 2, "pickup-8ft": 3, "tata-ace": 4 }
        sortedPkgs = [...allSvcPkgs].sort((a, b) => (truckOrder[a.slug] || 99) - (truckOrder[b.slug] || 99))
      } else if (svc.slug === "two-wheeler") {
        const bikeOrder = { "2-wheeler-electric-express": 1, "2-wheeler": 2 }
        sortedPkgs = [...allSvcPkgs].sort((a, b) => (bikeOrder[a.slug] || 99) - (bikeOrder[b.slug] || 99))
      } else if (svc.slug === "packers-movers") {
        const moverOrder = { "1-rk-1-bhk-shifting": 1, "2-bhk-3-bhk-shifting": 2, "villa-office-relocation": 3 }
        sortedPkgs = [...allSvcPkgs].sort((a, b) => (moverOrder[a.slug] || 99) - (moverOrder[b.slug] || 99))
      } else if (svc.slug === "cockroach-control") {
        const cockroachOrder = { 
          "pest-kb-main": 1, 
          "pest-apt-main": 2, 
          "pest-bung-main": 3,
          "pest-termite-kb": 4,
          "pest-termite-apt": 5,
          "pest-termite-bung": 6
        }
        sortedPkgs = [...allSvcPkgs].sort((a, b) => (cockroachOrder[a.slug] || 99) - (cockroachOrder[b.slug] || 99))
      }

      // Filter by search query if present
      const getFilteredPkgs = (pkgs) => {
        const q = searchQuery.trim().toLowerCase()
        if (!q) return pkgs
        return pkgs.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            (p.tag && p.tag.toLowerCase().includes(q)) ||
            (p.description && p.description.toLowerCase().includes(q)) ||
            svc.name.toLowerCase().includes(q)
        )
      }

      if (svc.slug === "kitchen-cleaning") {
        const groups = [
          {
            subSlug: "packages",
            displayName: "Kitchen Cleaning",
            filterFn: (p) => 
              p.slug.startsWith("occ-") || 
              p.slug.startsWith("empty-") ||
              p.slug.startsWith("package-") ||
              // Fallback: if it doesn't match any other group prefix, put it in full kitchen packages
              (!p.slug.startsWith("appliance-") && !p.slug.startsWith("app-") &&
               !p.slug.includes("fridge") && !p.slug.includes("microwave") && !p.slug.includes("chimney") &&
               !p.slug.includes("stove") && !p.slug.includes("dishwasher") && !p.slug.includes("air-fryer") &&
               !p.slug.includes("otg") && !p.slug.includes("sandwich") &&
               !p.slug.startsWith("kitchen-") && !p.slug.startsWith("cabinet-") && !p.slug.startsWith("tile-") && !p.slug.startsWith("care-") &&
               !p.slug.startsWith("quick-") && !p.slug.startsWith("sink-") && !p.slug.startsWith("dining-") &&
               !p.slug.startsWith("fan-") && !p.slug.startsWith("balcony-") && !p.slug.startsWith("door-") && !p.slug.startsWith("addon-"))
          },
          {
            subSlug: "appliance",
            displayName: "single appliance cleaning",
            filterFn: (p) =>
              p.slug.startsWith("appliance-") ||
              p.slug.startsWith("app-") ||
              p.slug.includes("fridge") ||
              p.slug.includes("microwave") ||
              p.slug.includes("chimney") ||
              p.slug.includes("stove") ||
              p.slug.includes("dishwasher") ||
              p.slug.includes("air-fryer") ||
              p.slug.includes("otg") ||
              p.slug.includes("sandwich"),
            transformFn: (pkgs, getFilteredPkgs) => {
              // Group fridge and stove items
              const finalPkgs = [];
              const fridgeSub = pkgs.filter(p => p.slug.startsWith("fridge-"));
              const stoveSub = pkgs.filter(p => p.slug.startsWith("stove-"));
              const remaining = pkgs.filter(p => !p.slug.startsWith("fridge-") && !p.slug.startsWith("stove-"));

              if (fridgeSub.length > 0) {
                finalPkgs.push({
                   id: "fridge-parent",
                   name: "Fridge cleaning",
                   slug: "fridge-parent",
                   description: "Thorough interior defrosting and rack-by-rack deep cleaning.",
                   base_price: Math.min(...fridgeSub.map(p => Number(p.base_price) || 0)),
                   duration: fridgeSub[0]?.duration || "1.5 hrs",
                   status: fridgeSub.some(p => p.status === "ACTIVE") ? "ACTIVE" : "INACTIVE",
                   subOptions: fridgeSub,
                });
              }

              if (stoveSub.length > 0) {
                finalPkgs.push({
                   id: "stove-parent",
                   name: "Gas stove cleaning",
                   slug: "stove-parent",
                   description: "Surface cleaning of gas stove burners and knobs to remove grease.",
                   base_price: Math.min(...stoveSub.map(p => Number(p.base_price) || 0)),
                   duration: stoveSub[0]?.duration || "45 mins",
                   status: stoveSub.some(p => p.status === "ACTIVE") ? "ACTIVE" : "INACTIVE",
                   subOptions: stoveSub,
                });
              }

              finalPkgs.push(...remaining);

              // Sort finalPkgs to match KITCHEN_SLUG_ORDER
              finalPkgs.sort((a, b) => {
                const idxA = KITCHEN_SLUG_ORDER.indexOf(a.slug);
                const idxB = KITCHEN_SLUG_ORDER.indexOf(b.slug);
                const orderA = idxA !== -1 ? idxA : 999;
                const orderB = idxB !== -1 ? idxB : 999;
                return orderA - orderB;
              });

              return getFilteredPkgs(finalPkgs);
            }
          },
          {
            subSlug: "cabinet_tile",
            displayName: "Cabinet & Tile Care",
            filterFn: (p) =>
              (p.slug.startsWith("kitchen-") ||
               p.slug.startsWith("cabinet-") ||
               p.slug.startsWith("tile-") ||
               p.slug.startsWith("care-")) &&
              !p.slug.includes("fridge") &&
              !p.slug.includes("microwave") &&
              !p.slug.includes("chimney") &&
              !p.slug.includes("stove") &&
              !p.slug.includes("dishwasher") &&
              !p.slug.includes("air-fryer") &&
              !p.slug.includes("otg") &&
              !p.slug.includes("sandwich"),
          },
          {
            subSlug: "addons",
            displayName: "Quick Extra Services",
            filterFn: (p) =>
              p.slug.startsWith("quick-") ||
              p.slug.startsWith("sink-") ||
              p.slug.startsWith("dining-") ||
              p.slug.startsWith("fan-") ||
              p.slug.startsWith("balcony-") ||
              p.slug.startsWith("door-") ||
              p.slug.startsWith("addon-"),
          },
        ]

        const KITCHEN_SLUG_ORDER = [
          "occ-basic",
          "occ-deep",
          "empty-kitchen",
          "fridge-parent",
          "fridge-single",
          "fridge-double",
          "fridge-triple",
          "kitchen-microwave-clean",
          "chimney-clean",
          "chimney-stove-clean",
          "stove-parent",
          "stove-2b",
          "stove-3b",
          "stove-4b",
          "dishwasher-clean",
          "air-fryer-clean",
          "otg-clean",
          "sandwich-clean",
          "kitchen-tiles-slabs",
          "cabinet-trolley-clean",
          "quick-sink-under-sink",
          "quick-kitchen-window",
          "quick-dining-table",
          "quick-fan-clean",
          "quick-exhaust-fan-clean",
          "quick-balcony-upto-4ft",
          "quick-balcony-above-4ft",
          "quick-door-clean"
        ]

        return groups.map((g) => {
          let groupPkgs = allSvcPkgs.filter(g.filterFn)
          groupPkgs = [...groupPkgs].sort((a, b) => {
            const idxA = KITCHEN_SLUG_ORDER.indexOf(a.slug)
            const idxB = KITCHEN_SLUG_ORDER.indexOf(b.slug)
            const orderA = idxA !== -1 ? idxA : 999
            const orderB = idxB !== -1 ? idxB : 999
            return orderA - orderB
          })
          const finalPkgs = g.transformFn ? g.transformFn(groupPkgs, getFilteredPkgs) : getFilteredPkgs(groupPkgs);
          return {
            service: {
              ...svc,
              id: `${svc.id}-${g.subSlug}`,
              virtualSlug: g.subSlug,
              realServiceId: svc.id,
            },
            displayName: g.displayName,
            icon: getServiceIcon(g.subSlug, g.displayName),
            totalPackages: finalPkgs.length,
            packages: finalPkgs,
          }
        })
      }

      if (svc.slug === "full-house-cleaning" || svc.slug === "house-cleaning" || svc.slug === "full_house_cleaning") {
        const groups = [
          {
            subSlug: "full_apartment",
            displayName: "Full house cleaning",
            filterFn: (p) => p.slug.includes("-apt-") && (p.slug.startsWith("classic-") || p.slug.startsWith("gold-") || p.slug.startsWith("diamond-")),
          },
          {
            subSlug: "unoccupied_apartment",
            displayName: "Unoccupied Apartment",
            filterFn: (p) => p.slug === "unfurnished-apt-deep",
          },
          {
            subSlug: "full_bungalow",
            displayName: "Occupied Bungalow",
            filterFn: (p) => p.slug.includes("-bungalow-") && (p.slug.startsWith("classic-") || p.slug.startsWith("gold-") || p.slug.startsWith("diamond-")),
          },
          {
            subSlug: "unoccupied_bungalow",
            displayName: "Unoccupied Bungalow",
            filterFn: (p) => p.slug === "unoccupied-bungalow-deep",
          },
          {
            subSlug: "partial_home",
            displayName: "Quick Extra Services",
            filterFn: (p) => p.slug === "quick-balcony-upto-4ft" || p.slug === "quick-balcony-above-4ft" || p.slug === "window-clean-under-4" || p.slug === "window-clean-above-4" || p.slug === "quick-dining-table" || p.slug === "kitchen-microwave-clean",
          }
        ]

        const HOUSE_SLUG_ORDER = [
          "classic-apt-deep",
          "gold-apt-deep",
          "diamond-apt-deep",
          "unfurnished-apt-deep",
          "classic-bungalow-deep",
          "gold-bungalow-deep",
          "diamond-bungalow-deep",
          "unoccupied-bungalow-deep",
          "quick-balcony-upto-4ft",
          "quick-balcony-above-4ft",
          "window-clean-under-4",
          "window-clean-above-4",
          "quick-dining-table",
          "kitchen-microwave-clean"
        ]

        return groups.map((g) => {
          let groupPkgs = allSvcPkgs.filter(g.filterFn)
          groupPkgs = [...groupPkgs].sort((a, b) => {
            const idxA = HOUSE_SLUG_ORDER.indexOf(a.slug)
            const idxB = HOUSE_SLUG_ORDER.indexOf(b.slug)
            const orderA = idxA !== -1 ? idxA : 999
            const orderB = idxB !== -1 ? idxB : 999
            return orderA - orderB
          })
          const finalPkgs = getFilteredPkgs(groupPkgs)
          return {
            service: {
              ...svc,
              id: `${svc.id}-${g.subSlug}`,
              virtualSlug: g.subSlug,
              realServiceId: svc.id,
            },
            displayName: g.displayName,
            icon: getServiceIcon(g.subSlug, g.displayName),
            totalPackages: finalPkgs.length,
            packages: finalPkgs,
          }
        })
      }

      if (svc.slug === "sofa-cleaning") {
        const groups = [
          {
            subSlug: "sofa",
            displayName: "Sofa Cleaning",
            filterFn: (p) => p.slug.includes("sofa-"),
          },
          {
            subSlug: "mattress",
            displayName: "Mattress Cleaning",
            filterFn: (p) => p.slug.startsWith("mattress-"),
          },
          {
            subSlug: "carpet",
            displayName: "Carpet Cleaning",
            filterFn: (p) => p.slug.startsWith("carpet-"),
          },
          {
            subSlug: "addons",
            displayName: "Quick Extra Services",
            filterFn: (p) =>
              p.slug === "quick-dining-table" ||
              p.slug === "quick-fan-clean" ||
              p.slug === "quick-door-clean" ||
              p.slug === "quick-balcony-upto-4ft" ||
              p.slug === "quick-balcony-above-4ft" ||
              p.slug.startsWith("fridge-"),
            transformFn: (pkgs, getFilteredPkgs) => {
              // Group fridge parent if subOptions exist
              const finalPkgs = [];
              const fridgeSub = pkgs.filter(p => p.slug.startsWith("fridge-"));
              const remaining = pkgs.filter(p => !p.slug.startsWith("fridge-"));

              if (fridgeSub.length > 0) {
                finalPkgs.push({
                  id: "fridge-parent",
                  name: "Fridge cleaning",
                  slug: "fridge-parent",
                  description: "Thorough interior defrosting and rack-by-rack deep cleaning.",
                  base_price: Math.min(...fridgeSub.map(p => Number(p.base_price) || 0)),
                  duration: fridgeSub[0]?.duration || "1.5 hrs",
                  status: fridgeSub.some(p => p.status === "ACTIVE") ? "ACTIVE" : "INACTIVE",
                  subOptions: fridgeSub,
                });
              }
              finalPkgs.push(...remaining);

              // Sort finalPkgs to match SOFA_SLUG_ORDER
              finalPkgs.sort((a, b) => {
                const idxA = SOFA_SLUG_ORDER.indexOf(a.slug);
                const idxB = SOFA_SLUG_ORDER.indexOf(b.slug);
                const orderA = idxA !== -1 ? idxA : 999;
                const orderB = idxB !== -1 ? idxB : 999;
                return orderA - orderB;
              });

              return getFilteredPkgs(finalPkgs);
            }
          },
        ]

        const SOFA_SLUG_ORDER = [
          "fabric-sofa-clean",
          "fabric-sofa-cushion-clean",
          "leather-sofa-clean",
          "leather-sofa-cushion-clean",
          "mattress-deep",
          "mattress-pillow-refresh",
          "carpet-deep",
          "quick-dining-table",
          "quick-fan-clean",
          "quick-door-clean",
          "fridge-parent",
          "fridge-single",
          "fridge-double",
          "fridge-triple",
          "quick-balcony-upto-4ft",
          "quick-balcony-above-4ft"
        ]

        return groups.map((g) => {
          let groupPkgs = allSvcPkgs.filter(g.filterFn)
          groupPkgs = [...groupPkgs].sort((a, b) => {
            const idxA = SOFA_SLUG_ORDER.indexOf(a.slug)
            const idxB = SOFA_SLUG_ORDER.indexOf(b.slug)
            const orderA = idxA !== -1 ? idxA : 999
            const orderB = idxB !== -1 ? idxB : 999
            return orderA - orderB
          })
          const finalPkgs = g.transformFn ? g.transformFn(groupPkgs, getFilteredPkgs) : getFilteredPkgs(groupPkgs);
          return {
            service: {
              ...svc,
              id: `${svc.id}-${g.subSlug}`,
              virtualSlug: g.subSlug,
              realServiceId: svc.id,
            },
            displayName: g.displayName,
            icon: getServiceIcon(g.subSlug, g.displayName),
            totalPackages: finalPkgs.length,
            packages: finalPkgs,
          }
        })
      }

      if (svc.slug === "cockroach-control") {
        const groups = [
          {
            subSlug: "cockroach",
            displayName: "Cockroach Control",
            filterFn: (p) => p.slug.startsWith("pest-") && !p.slug.includes("termite"),
          },
          {
            subSlug: "termite",
            displayName: "Termite Control",
            filterFn: (p) => p.slug.includes("termite"),
          }
        ]

        const PEST_SLUG_ORDER = [
          "pest-kb-main",
          "pest-apt-main",
          "pest-bung-main",
          "pest-termite-kb",
          "pest-termite-apt",
          "pest-termite-bung"
        ]

        return groups.map((g) => {
          let groupPkgs = allSvcPkgs.filter(g.filterFn)
          groupPkgs = [...groupPkgs].sort((a, b) => {
            const idxA = PEST_SLUG_ORDER.indexOf(a.slug)
            const idxB = PEST_SLUG_ORDER.indexOf(b.slug)
            const orderA = idxA !== -1 ? idxA : 999
            const orderB = idxB !== -1 ? idxB : 999
            return orderA - orderB
          })
          const finalPkgs = getFilteredPkgs(groupPkgs)
          return {
            service: {
              ...svc,
              id: `${svc.id}-${g.subSlug}`,
              virtualSlug: g.subSlug,
              realServiceId: svc.id,
            },
            displayName: g.displayName,
            icon: getServiceIcon(g.subSlug, g.displayName),
            totalPackages: finalPkgs.length,
            packages: finalPkgs,
          }
        })
      }

      if (svc.slug === "ants-bed-bugs-control") {
        const groups = [
          {
            subSlug: "ants",
            displayName: "Ants Control",
            filterFn: (p) => p.slug.includes("ant"),
          },
          {
            subSlug: "bedbugs",
            displayName: "Bed Bugs Control",
            filterFn: (p) => p.slug.includes("bedbug"),
          }
        ]

        const PEST_SLUG_ORDER = [
          "pest-ant-kb",
          "pest-ant-apt",
          "pest-ant-bung",
          "pest-bedbug-main"
        ]

        return groups.map((g) => {
          let groupPkgs = allSvcPkgs.filter(g.filterFn)
          groupPkgs = [...groupPkgs].sort((a, b) => {
            const idxA = PEST_SLUG_ORDER.indexOf(a.slug)
            const idxB = PEST_SLUG_ORDER.indexOf(b.slug)
            const orderA = idxA !== -1 ? idxA : 999
            const orderB = idxB !== -1 ? idxB : 999
            return orderA - orderB
          })
          const finalPkgs = getFilteredPkgs(groupPkgs)
          return {
            service: {
              ...svc,
              id: `${svc.id}-${g.subSlug}`,
              virtualSlug: g.subSlug,
              realServiceId: svc.id,
            },
            displayName: g.displayName,
            icon: getServiceIcon(g.subSlug, g.displayName),
            totalPackages: finalPkgs.length,
            packages: finalPkgs,
          }
        })
      }

      // Friendly display name formatting (e.g. "Two Wheeler" -> "2 Wheeler")
      let displayName = svc.name
      if (svc.slug === "two-wheeler" || svc.name === "Two Wheeler") displayName = "2 Wheeler"
      if (svc.slug === "truck") displayName = "Truck"
      if (svc.slug === "packers-movers") displayName = "Packers & Movers"
      if (svc.slug === "cockroach-control") displayName = "Cockroach & Termite control"

      return [{
        service: svc,
        displayName,
        icon: getServiceIcon(svc.slug, svc.name),
        totalPackages: allSvcPkgs.length,
        packages: getFilteredPkgs(sortedPkgs),
      }]
    })

    return result
  }, [activeCategoryKey, categoryMap, services, packages, searchQuery])

  // Compute package count for each of the 7 tabs
  const pillarCounts = useMemo(() => {
    const counts = {}
    CORE_PILLARS.forEach((pillar) => {
      const dbCat = categoryMap[pillar.key]
      if (!dbCat) {
        counts[pillar.key] = 0
        return
      }
      let catServices = services.filter(
        (s) => String(s.category) === String(dbCat.id) || s.category_id === dbCat.id || s.category_slug === pillar.key
      )
      if (pillar.key === "home_pest_control") {
        catServices = catServices.filter(
          (s) => s.slug !== "general" && s.slug !== "security"
        )
      }
      const serviceIds = new Set(catServices.map((s) => String(s.id)))
      const total = packages.filter((p) => {
        const svcId = String(p.service?.id || p.service || p.service_id)
        return serviceIds.has(svcId)
      }).length
      counts[pillar.key] = total
    })
    return counts
  }, [CORE_PILLARS, categoryMap, services, packages])

  // Total packages under active category
  const activeCategoryTotalCount = useMemo(() => {
    return activeCategoryServicesWithPackages.reduce((acc, curr) => acc + curr.packages.length, 0)
  }, [activeCategoryServicesWithPackages])

  // Filtered visible sub-services based on active sub-service tab
  const visibleServices = useMemo(() => {
    if (activeSubServiceKey === "all") {
      return activeCategoryServicesWithPackages
    }
    return activeCategoryServicesWithPackages.filter(
      (item) =>
        item.service.slug === activeSubServiceKey ||
        item.service.virtualSlug === activeSubServiceKey ||
        String(item.service.id) === String(activeSubServiceKey) ||
        String(item.service.realServiceId) === String(activeSubServiceKey) ||
        item.displayName.toLowerCase().replace(/[^a-z0-9]/g, "") === activeSubServiceKey.toLowerCase().replace(/[^a-z0-9]/g, "")
    )
  }, [activeSubServiceKey, activeCategoryServicesWithPackages])

  const handleSave = async (e) => {
    e.preventDefault()
    try {
      let finalSlug = editing.slug || ""
      if (editing.virtualSlug && !editing.id) {
        const prefixMap = {
          appliance: "appliance-",
          cabinet_tile: "cabinet-",
          addons: "quick-",
          packages: "package-",
          sofa: "sofa-",
          mattress: "mattress-",
          carpet: "carpet-"
        }
        const prefix = prefixMap[editing.virtualSlug]
        if (prefix && !finalSlug.startsWith(prefix)) {
          finalSlug = prefix + finalSlug
        }
      }

      const payload = {
        ...editing,
        slug: finalSlug,
        includes:
          typeof editing.includes === "string"
            ? editing.includes.split(",").map((s) => s.trim()).filter(Boolean)
            : editing.includes,
        excludes:
          typeof editing.excludes === "string"
            ? editing.excludes.split(",").map((s) => s.trim()).filter(Boolean)
            : editing.excludes,
        offer_price: null,
      }
      const res = editing.id
        ? await apiRequest(`/settings/catalog/v2/packages/${editing.id}/`, {
            method: "PUT",
            json: payload,
          })
        : await apiRequest("/settings/catalog/v2/packages/", {
            method: "POST",
            json: payload,
          })
      if (res.success) {
        showToast(editing.id ? "Package updated successfully" : "Package created successfully")
        setEditing(null)
        loadData()
      } else {
        showToast(res.message || "Save failed", "error")
      }
    } catch {
      showToast("Save failed", "error")
    }
  }

  const openQuickPriceEdit = (pkg) => {
    const slug = pkg.slug || pkg.id || ""
    const presets = DEFAULT_SUITABLE_PRESETS[slug] || DEFAULT_SUITABLE_PRESETS[pkg.id] || []

    // For virtual parent rows (fridge-parent, stove-parent), pull includes from first subOption
    let existingIncludes = Array.isArray(pkg.includes) ? pkg.includes : []
    if (existingIncludes.length === 0 && Array.isArray(pkg.subOptions) && pkg.subOptions.length > 0) {
      const firstSub = pkg.subOptions[0]
      existingIncludes = Array.isArray(firstSub.includes) ? firstSub.includes : []
    }

    const items = []
    const seen = new Set()

    // 1. If package has saved includes, add them first in their exact saved order
    if (existingIncludes.length > 0) {
      existingIncludes.forEach((inc, idx) => {
        const text = typeof inc === "string" ? inc.trim() : (inc?.text || "")
        const checked = typeof inc === "string" ? true : (inc.checked !== false)
        if (text && !seen.has(text.toLowerCase())) {
          seen.add(text.toLowerCase())
          items.push({
            id: `inc-${idx}-${Date.now()}`,
            text,
            checked: checked,
          })
        }
      })
    }

    // 2. Add preset items (checked if existingIncludes is empty, unchecked if not in existingIncludes)
    presets.forEach((preset, idx) => {
      const text = preset.trim()
      if (text && !seen.has(text.toLowerCase())) {
        seen.add(text.toLowerCase())
        items.push({
          id: `preset-${idx}-${Date.now()}`,
          text,
          checked: existingIncludes.length === 0,
        })
      }
    })

    // Load fallback defaults from SOFA_DETAIL_DATA, HOUSE_DETAILS_CONTENT, or STATIC_SERVICE_DETAIL_DATA
    const staticData = 
      SOFA_DETAIL_DATA[slug] || 
      SOFA_DETAIL_DATA[pkg.id] || 
      HOUSE_DETAILS_CONTENT[slug] || 
      HOUSE_DETAILS_CONTENT[pkg.id] || 
      STATIC_SERVICE_DETAIL_DATA[slug] || 
      STATIC_SERVICE_DETAIL_DATA[pkg.id] || 
      {}

    setQuickPriceEditing({
      ...pkg,
      base_price: Math.round(Number(pkg.base_price) || 0),
      tag: pkg.tag || (pkg.popular ? "Popular" : ""),
      checklist: items,
      image: pkg.image || "",
      sort_order: pkg.sort_order || 0,
      button_text: pkg.button_text || "Add",
      icon: pkg.icon || "",
      editingItemId: null,
      _vdOpen: true,
      viewDetails: (() => {
        // Normalize reviews: staticData uses 'comment' but admin UI uses 'text'
        const normalizeReviews = (revs) => (revs || []).map(r => ({
          ...r,
          text: r.text || r.comment || "",
          name: r.name || "",
          rating: r.rating || "5.0",
          enabled: r.enabled !== false,
        }));
        const hasSavedTools = Array.isArray(pkg.tools) && pkg.tools.length > 0;
        const hasSavedReady = Array.isArray(pkg.ready) && pkg.ready.length > 0;
        const hasSavedReviews = Array.isArray(pkg.reviews) && pkg.reviews.length > 0;
        const hasSavedFaqs = Array.isArray(pkg.faqs) && pkg.faqs.length > 0;

        return {
          tools: hasSavedTools ? pkg.tools : (staticData.tools || []),
          ready: hasSavedReady ? pkg.ready : (staticData.ready || []),
          reviews: hasSavedReviews ? normalizeReviews(pkg.reviews) : normalizeReviews(staticData.reviews),
          faqs: hasSavedFaqs ? pkg.faqs : (staticData.faqs || []),
        };
      })(),
    })
    setNewItemText("")
  }

  const handleQuickPriceSave = async (e) => {
    e.preventDefault()
    if (!quickPriceEditing) return
    try {
      let finalIncludes = []
      if (Array.isArray(quickPriceEditing.checklist)) {
        finalIncludes = quickPriceEditing.checklist
          .filter((i) => i.text && i.text.trim())
          .map((i) => ({ text: i.text.trim(), checked: i.checked }))
      } else if (typeof quickPriceEditing.includes === "string") {
        finalIncludes = quickPriceEditing.includes.split(",").map((s) => ({ text: s.trim(), checked: true })).filter(i => i.text)
      } else if (Array.isArray(quickPriceEditing.includes)) {
        finalIncludes = quickPriceEditing.includes.map(i => typeof i === "string" ? { text: i, checked: true } : i)
      }

      const isPop = Boolean(
        quickPriceEditing.tag &&
        quickPriceEditing.tag.toLowerCase().includes("popular")
      )

      const vd = quickPriceEditing.viewDetails || {}
      const payload = {
        name: quickPriceEditing.name,
        description: quickPriceEditing.description || "",
        base_price: Math.round(Number(quickPriceEditing.base_price) || 0),
        tag: quickPriceEditing.tag || "",
        popular: isPop,
        duration: quickPriceEditing.duration || "",
        includes: finalIncludes,
        image: quickPriceEditing.image || "",
        offer_price: null,
        tools: Array.isArray(vd.tools)
          ? vd.tools
              .map(t => {
                const text = typeof t === "string" ? t : (t.text || "");
                const enabled = typeof t === "string" ? true : (t.enabled !== false);
                return { text, enabled };
              })
              .filter(t => t.text.trim())
          : [],
        ready: Array.isArray(vd.ready)
          ? vd.ready
              .map(r => {
                const text = typeof r === "string" ? r : (r.text || "");
                const enabled = typeof r === "string" ? true : (r.enabled !== false);
                return { text, enabled };
              })
              .filter(r => r.text.trim())
          : [],
        reviews: Array.isArray(vd.reviews)
          ? vd.reviews
              .map(r => ({
                name: r.name || "",
                text: r.text || "",
                rating: r.rating || "5.0",
                enabled: r.enabled !== false
              }))
              .filter(r => r.name.trim() || r.text.trim())
          : [],
        faqs: Array.isArray(vd.faqs)
          ? vd.faqs
              .map(f => ({
                q: f.q || "",
                a: f.a || "",
                enabled: f.enabled !== false
              }))
              .filter(f => f.q.trim() || f.a.trim())
          : [],
        sort_order: parseInt(quickPriceEditing.sort_order) || 0,
        button_text: quickPriceEditing.button_text || "Add",
        icon: quickPriceEditing.icon || "",
      }

      // Handle virtual parent rows (fridge-parent, stove-parent) — save includes to each sub-option
      const isVirtualParent = (quickPriceEditing.id === "fridge-parent" || quickPriceEditing.id === "stove-parent") && Array.isArray(quickPriceEditing.subOptions)
      if (isVirtualParent) {
        const subIds = quickPriceEditing.subOptions.map(s => s.id).filter(Boolean)
        const results = await Promise.all(
          subIds.map(subId =>
            apiRequest(`/settings/catalog/v2/packages/${subId}/`, {
              method: "PUT",
              json: { includes: finalIncludes, description: payload.description },
            })
          )
        )
        const allOk = results.every(r => r.success)
        if (allOk) {
          showToast(`Includes updated for all ${quickPriceEditing.name} variants`)
          setQuickPriceEditing(null)
          loadData()
        } else {
          showToast("Some updates failed", "error")
        }
        return
      }

      const targetId = quickPriceEditing.realPackageId || quickPriceEditing.id || quickPriceEditing.slug
      const res = await apiRequest(`/settings/catalog/v2/packages/${targetId}/`, {
        method: "PUT",
        json: payload,
      })
      if (res && res.success) {
        showToast(`Changes published for "${quickPriceEditing.name}"`)
        setQuickPriceEditing(null)
        loadData()
      } else {
        showToast(res?.message || "Update failed", "error")
      }
    } catch (err) {
      console.error("Save failed:", err)
      showToast("Update failed", "error")
    }
  }

  const handleServiceSave = async (e) => {
    e.preventDefault()
    if (!serviceEditing) return
    try {
      const payload = {
        name: serviceEditing.name,
        description: serviceEditing.description || "",
      }
      const res = await apiRequest(`/settings/catalog/v2/services/${serviceEditing.id}/`, {
        method: "PUT",
        json: payload,
      })
      if (res.success) {
        showToast(`Service "${serviceEditing.name}" updated successfully`)
        setServiceEditing(null)
        loadData()
      } else {
        showToast(res.message || "Service update failed", "error")
      }
    } catch {
      showToast("Service update failed", "error")
    }
  }

  const openServiceCustomizer = (service) => {
    const cust = service.customization || {}
    setServiceCustomizing({
      ...service,
      customization: {
        rating: cust.rating || "4.8",
        reviews: cust.reviews || "15K",
        points: Array.isArray(cust.points) ? cust.points : [],
        benefits: Array.isArray(cust.benefits) ? cust.benefits : [],
        includes_heading: cust.includes_heading || "WHAT'S INCLUDED",
        includes: Array.isArray(cust.includes) ? cust.includes : [],
        free_inspection_heading: cust.free_inspection_heading || "FREE SITE INSPECTION INCLUDED",
        free_inspection_enabled: cust.free_inspection_enabled !== false,
        inspection_highlights: Array.isArray(cust.inspection_highlights) ? cust.inspection_highlights : [],
        excludes_heading: cust.excludes_heading || "WHAT'S NOT INCLUDED",
        excludes_enabled: !cust.excludes_enabled !== false,
        excludes: Array.isArray(cust.excludes) ? cust.excludes : [],
        steps_heading: cust.steps_heading || "HOW PAINTING WORKS",
        steps: Array.isArray(cust.steps) ? cust.steps : [],
        faqs: Array.isArray(cust.faqs) ? cust.faqs : [],
        starting_fare: cust.starting_fare || "",
        button_text: cust.button_text || "View details",
        estimate_cta: cust.estimate_cta || "Get Estimate",
        suboptions_heading: cust.suboptions_heading || "",
        faqs_heading: cust.faqs_heading || "",
        reviews_heading: cust.reviews_heading || "",
        price_list: Array.isArray(cust.price_list) ? cust.price_list : [],
        paint_types: Array.isArray(cust.paint_types) ? cust.paint_types : [],
      }
    })
    setCustomizerTab("general")
  }

  const handleServiceCustomizerSave = async (e) => {
    e.preventDefault()
    if (!serviceCustomizing) return
    try {
      const payload = {
        name: serviceCustomizing.name,
        description: serviceCustomizing.description || "",
        image: serviceCustomizing.image || "",
        is_active: serviceCustomizing.is_active,
        sort_order: parseInt(serviceCustomizing.sort_order) || 0,
        customization: {
          ...serviceCustomizing.customization,
        }
      }
      const res = await apiRequest(`/settings/catalog/v2/services/${serviceCustomizing.id}/`, {
        method: "PUT",
        json: payload,
      })
      if (res.success) {
        showToast(`Service "${serviceCustomizing.name}" customized successfully!`)
        setServiceCustomizing(null)
        loadData()
      } else {
        showToast(res.message || "Customization failed", "error")
      }
    } catch (err) {
      showToast("Customization failed", "error")
    }
  }

  const handleDeletePackage = async (pkg) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${pkg.name}"? This will delete it from database and applications.`)) {
      return
    }
    try {
      const res = await apiRequest(`/settings/catalog/v2/packages/${pkg.id}/`, {
        method: "DELETE",
      })
      if (res.success) {
        showToast("Package deleted successfully")
        loadData()
      } else {
        showToast(res.message || "Delete failed", "error")
      }
    } catch {
      showToast("Delete failed", "error")
    }
  }

  const openEdit = (pkg) => {
    setEditing({
      ...pkg,
      base_price: Math.round(Number(pkg.base_price) || 0),
      includes: Array.isArray(pkg.includes) ? pkg.includes.join(", ") : "",
      excludes: Array.isArray(pkg.excludes) ? pkg.excludes.join(", ") : "",
      image: pkg.image || "",
    })
  }

  const handleToggleStatus = async (pkg) => {
    const newStatus = pkg.status === "ACTIVE" ? "INACTIVE" : "ACTIVE"
    try {
      const res = await apiRequest(`/settings/catalog/v2/packages/${pkg.id}/transition/`, {
        method: "POST",
        json: { status: newStatus, reason: `Status changed to ${newStatus}` },
      })
      if (res.success) {
        showToast(`"${pkg.name}" is now ${newStatus}`)
        loadData()
      } else {
        showToast(res.message || "Status update failed", "error")
      }
    } catch {
      showToast("Status update failed", "error")
    }
  }

  const handleTransition = async (pkg, newStatus) => {
    const reason = window.prompt(`Reason for moving "${pkg.name}" to ${newStatus}? (optional)`) || ""
    try {
      const res = await apiRequest(`/settings/catalog/v2/packages/${pkg.id}/transition/`, {
        method: "POST",
        json: { status: newStatus, reason },
      })
      if (res.success) {
        showToast(`Package status updated to ${newStatus}`)
        loadData()
      } else {
        showToast(res.message || "Transition failed", "error")
      }
    } catch {
      showToast("Transition failed", "error")
    }
  }

  const ActiveIcon = activePillar.icon

  const selectedServiceId = String(editing?.service?.id || editing?.service || "")
  const selectedService = services.find((s) => String(s.id) === selectedServiceId)
  const isVegetableService = Boolean(
    selectedService?.slug === "vegetables" || 
    selectedService?.name?.toLowerCase().includes("vegetable")
  )

  const namePlaceholder = isVegetableService
    ? "e.g. Tomato (Thakkali), Onion (Vengayam), Potato (Urulaikilangu)"
    : "e.g. Pickup 8ft, Instant Courier, 1 BHK Shifting"

  const slugPlaceholder = isVegetableService
    ? "e.g. tomato-thakkali, onion-vengayam"
    : "e.g. pickup-8ft, instant-courier"

  const descPlaceholder = isVegetableService
    ? "e.g. Fresh farm-picked organic vegetables with quality assurance..."
    : "Detailed description of this vehicle or package offering..."

  const includesPlaceholder = isVegetableService
    ? "e.g. Freshly picked, Organic certified, Quality assured"
    : "e.g. Closed container, Verified driver, GPS tracking"

  const excludesPlaceholder = isVegetableService
    ? "e.g. Damage during transit, Rotten parts refund"
    : "e.g. Heavy toll extra, Helper unassisted"

  return (
    <div style={{ animation: "fadeUp 0.3s ease both" }} className="p-4 sm:p-6 lg:p-8 w-full max-w-[1720px] mx-auto font-sans text-slate-800 space-y-5">
      <ToastBanner toast={toast} />

      {/* ── 1. The 7 Top-Level Service Tabs (Horizontal Bluish/Indigo Navigation Bar) ── */}
      <div className="mb-5 overflow-x-auto pb-1.5 scrollbar-thin">
        <div className="flex items-center gap-2 min-w-max bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200/80 shadow-xs">
          {CORE_PILLARS.map((pillar) => {
            const isActive = activeCategoryKey === pillar.key
            const count = pillarCounts[pillar.key] || 0

            return (
              <button
                key={pillar.key}
                type="button"
                onClick={() => {
                  setActiveCategoryKey(pillar.key)
                  setActiveSubServiceKey("all")
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs transition-all duration-150 cursor-pointer border ${
                  isActive
                    ? pillar.activeClass
                    : "bg-transparent text-slate-600 hover:text-indigo-950 hover:bg-white/80 border-transparent"
                }`}
              >
                <span className="whitespace-nowrap font-bold">{pillar.shortName}</span>
                <span
                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-slate-200/70 text-slate-600"
                  }`}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── 2. Top Header Banner Card for Selected Category (Matching Blue Theme) ── */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 lg:p-7 shadow-sm border border-slate-200/90 mb-5 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-start gap-4">
            <div>
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 text-indigo-800 text-xs font-semibold mb-2 border border-blue-200/80 shadow-xs">
                Enterprise Service Pillars &amp; Catalog
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Service Packages &amp; Pricing
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-normal mt-1">
                Configure rates, tiered packages, and vehicle dispatch pricing for {activePillar.fullName}.
              </p>
            </div>
          </div>

          {/* Add Package Button (Bluish / Indigo Theme matching Log Ticket) */}
          <div className="flex items-center gap-2.5 shrink-0 self-start md:self-center">
            <button
              type="button"
              onClick={() => {
                const firstSvc = activeCategoryServicesWithPackages[0]?.service || services[0]
                setEditing({
                  ...EMPTY_PACKAGE,
                  service: firstSvc?.id ? String(firstSvc.id) : "",
                  virtualSlug: firstSvc?.virtualSlug || "",
                })
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" strokeWidth={2.5} />
              <span>Add Package</span>
            </button>
          </div>
        </div>

        {/* Search & Filter Controls */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full sm:max-w-xl">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={`Search packages, vehicles, or fares in ${activePillar.shortName}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white focus:bg-white text-xs font-normal text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
            />
          </div>

          {/* Expand / Filter Info */}
          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <span className="text-xs text-slate-500 font-medium">
              Showing <strong className="text-slate-800">{activeCategoryTotalCount}</strong> options in <span className="font-semibold text-slate-700">{activePillar.shortName}</span>
            </span>
          </div>
        </div>
      </div>

      {/* ── 3. Sub-Services / Sub-Modules Interactive Bar ── */}
      {activeCategoryServicesWithPackages.length > 0 && (
        <div className="bg-white rounded-2xl p-3.5 shadow-xs border border-slate-200/90 mb-5">
          <div className="flex items-center justify-between gap-3 mb-2 px-1">
            <div className="flex items-center text-xs font-bold text-slate-700 uppercase tracking-wider">
              <span>Sub-Modules / Services</span>
            </div>
            <span className="text-[11px] text-slate-400 font-normal">Click a module to view its specific packages</span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {/* "All" Tab Option */}
            <button
              type="button"
              onClick={() => setActiveSubServiceKey("all")}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                activeSubServiceKey === "all"
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                  : "bg-slate-50 text-slate-700 border-slate-200/80 hover:bg-indigo-50/60 hover:text-indigo-900"
              }`}
            >
              <span>All</span>
              <span
                className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md ${
                  activeSubServiceKey === "all" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"
                }`}
              >
                {activeCategoryServicesWithPackages.reduce((acc, curr) => acc + curr.totalPackages, 0)}
              </span>
            </button>

            {/* Individual Sub-Service Tabs (e.g. 2 Wheeler, Truck, Packers & Movers) */}
            {(() => {
              const seen = new Set()
              const uniqueItems = activeCategoryServicesWithPackages.filter((item) => {
                const key = item.service.realServiceId || item.service.slug || item.service.id
                if (seen.has(key)) return false
                seen.add(key)
                return true
              })

              return uniqueItems.map((item) => {
                const serviceKey = item.service.realServiceId || item.service.slug || item.service.id
                const totalCount = activeCategoryServicesWithPackages
                  .filter(x => (x.service.realServiceId || x.service.slug || x.service.id) === serviceKey)
                  .reduce((acc, x) => acc + x.totalPackages, 0)
                
                const SubIcon = item.icon
                const isSubActive =
                  activeSubServiceKey === item.service.slug ||
                  activeSubServiceKey === item.service.virtualSlug ||
                  String(activeSubServiceKey) === String(item.service.id) ||
                  String(activeSubServiceKey) === String(item.service.realServiceId) ||
                  item.displayName.toLowerCase().replace(/[^a-z0-9]/g, "") === activeSubServiceKey.toLowerCase().replace(/[^a-z0-9]/g, "")

                return (
                  <button
                    key={item.service.id}
                    type="button"
                    onClick={() => setActiveSubServiceKey(item.service.slug || String(item.service.id))}
                    className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                      isSubActive
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                        : "bg-slate-50 text-slate-700 border-slate-200/80 hover:bg-indigo-50/60 hover:text-indigo-900"
                    }`}
                  >
                    <SubIcon className="w-3.5 h-3.5" />
                    <span>{item.service.slug === "cockroach-control" ? "Cockroach & Termite control" : item.displayName}</span>
                    <span
                      className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md ${
                        isSubActive ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {totalCount}
                    </span>
                  </button>
                )
              })
            })()}
          </div>
        </div>
      )}

      {/* ── 4. Main Sub-Services Packages Content Area ── */}
      {loading ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 shadow-sm">
          <div className="w-8 h-8 border-3 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-semibold text-slate-600">Loading catalog packages &amp; fares…</p>
        </div>
      ) : activeCategoryServicesWithPackages.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 shadow-sm">
          <FolderOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-slate-800">No services configured for {activePillar.name}</h3>
          <p className="text-xs text-slate-400 mt-0.5">Add services and packages to configure pricing for this pillar.</p>
        </div>
      ) : visibleServices.length === 0 || visibleServices.every((s) => s.packages.length === 0 && s.totalPackages === 0) ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 shadow-sm">
          <Box className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-slate-800">No packages found</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {searchQuery ? "Try refining your search query." : "Click 'Add Package' to add options to this service."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {visibleServices.map((svcItem) => {
            const SubIcon = svcItem.icon
            const pkgList = svcItem.packages

            return (
              <div
                key={svcItem.service.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden transition-all hover:border-slate-300"
              >
                {/* Service Sub-Header with Icon, Count & Add Option */}
                <div className="bg-slate-50/90 px-4 sm:px-5 py-3.5 border-b border-slate-200/80 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-bold text-slate-900">
                          {svcItem.displayName}
                        </span>
                        <span className="text-xs font-semibold text-indigo-800 bg-indigo-50 border border-indigo-200/70 px-2 py-0.5 rounded-full">
                          {pkgList.length} {pkgList.length === 1 ? "option" : "options"}
                        </span>
                        {activeCategoryKey === "paintings" || activeCategoryKey === "mason" ? (
                          <button
                            type="button"
                            onClick={() => openServiceCustomizer(svcItem.service)}
                            title="Customise Booking Card & Detail Page Content"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white text-xs font-bold border border-indigo-200/80 shadow-xs transition-all cursor-pointer"
                          >
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                            <span>Customise Page</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setServiceEditing({ ...svcItem.service })}
                            title="Edit Sub-Service Heading & Description"
                            className="p-1 rounded-lg text-slate-400 hover:text-indigo-700 hover:bg-indigo-50 transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      {svcItem.service.description && (
                        <p className="text-[11px] text-slate-400 truncate max-w-lg sm:max-w-2xl lg:max-w-4xl">
                          {svcItem.service.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setEditing({
                        ...EMPTY_PACKAGE,
                        service: String(svcItem.service.realServiceId || svcItem.service.id),
                        virtualSlug: svcItem.service.virtualSlug || "",
                      })
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100/80 px-3 py-1.5 rounded-xl transition-colors cursor-pointer border border-indigo-200/60"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Option</span>
                  </button>
                </div>

                {/* Packages Table Under this Sub-Service */}
                {pkgList.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs sm:text-sm">
                    No packages or options under {svcItem.displayName} matching search.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-700 uppercase tracking-wider text-[10px] font-bold">
                          <th className="py-3 px-4 sm:px-5 font-extrabold">Package / Option Name</th>
                          <th className="py-3 px-4 sm:px-5 font-extrabold">Starting Fare</th>
                          <th className="py-3 px-4 sm:px-5 font-extrabold">Highlight Badge</th>
                          <th className="py-3 px-4 sm:px-5 font-extrabold">{activeCategoryKey === "goods_transports" ? "Badge Duration" : "Duration / ETA"}</th>
                          <th className="py-3 px-4 sm:px-5 font-extrabold">Status</th>
                          <th className="py-3 px-4 sm:px-5 font-extrabold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {pkgList.flatMap((pkg) => {
                          const isParent = !!pkg.subOptions;
                          const isExpanded = expandedPackages.has(pkg.id);
                          const rows = [];

                          rows.push(
                            <tr key={pkg.id} className="hover:bg-slate-50/80 transition-colors group">
                              {/* Package Name & Description */}
                              <td className="py-3.5 px-4 sm:px-5 max-w-xs sm:max-w-md">
                                <div className="flex items-center gap-2">
                                  {isParent && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        const newSet = new Set(expandedPackages);
                                        if (newSet.has(pkg.id)) {
                                          newSet.delete(pkg.id);
                                        } else {
                                          newSet.add(pkg.id);
                                        }
                                        setExpandedPackages(newSet);
                                      }}
                                      className="p-1 rounded hover:bg-slate-200 text-slate-500"
                                    >
                                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                    </button>
                                  )}
                                  <div className="font-bold text-slate-900 text-xs sm:text-sm">{pkg.name}</div>
                                </div>
                                {pkg.description ? (
                                  <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5 ml-6">
                                    {pkg.description}
                                  </p>
                                ) : (
                                  <p className="text-[11px] text-slate-400 italic mt-0.5 ml-6">No description set</p>
                                )}
                              </td>

                              {/* Starting Fare / Price */}
                              <td className="py-3.5 px-4 sm:px-5">
                                <div className="inline-flex items-center gap-1 text-sm font-extrabold text-indigo-700 bg-blue-50/80 border border-indigo-200/90 px-2.5 py-1 rounded-lg">
                                  <span>₹{Math.round(Number(pkg.base_price) || 0).toLocaleString("en-IN")}</span>
                                </div>
                              </td>

                              {/* Highlight / Popularity Badge */}
                              <td className="py-3.5 px-4 sm:px-5">
                                {pkg.tag || pkg.popular ? (
                                  <span
                                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold border ${
                                      (pkg.tag || "").toLowerCase().includes("popular") || pkg.popular
                                        ? "bg-amber-50 text-amber-700 border-amber-200/90"
                                        : (pkg.tag || "").toLowerCase().includes("rare")
                                        ? "bg-slate-100 text-slate-700 border-slate-200"
                                        : (pkg.tag || "").toLowerCase().includes("best")
                                        ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                        : "bg-blue-50 text-blue-700 border-blue-200"
                                    }`}
                                  >
                                    ★ {pkg.tag || "Popular"}
                                  </span>
                                ) : (
                                  <span className="text-slate-300 text-xs font-medium">—</span>
                                )}
                              </td>

                              {/* Duration / ETA */}
                              <td className="py-3.5 px-4 sm:px-5">
                                {pkg.duration ? (
                                  <span className="text-slate-600 font-medium">{pkg.duration}</span>
                                ) : (
                                  <span className="text-slate-300 text-xs">—</span>
                                )}
                              </td>

                              {/* Status (Clickable Toggle) */}
                              <td className="py-3.5 px-4 sm:px-5">
                                <button
                                  type="button"
                                  onClick={() => !isParent && handleToggleStatus(pkg)}
                                  title={isParent ? "" : `Click to set ${pkg.status === "ACTIVE" ? "INACTIVE" : "ACTIVE"}`}
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wide uppercase border transition-all cursor-pointer ${
                                    pkg.status === "ACTIVE"
                                      ? "bg-blue-50 text-blue-700 border-blue-200/90"
                                      : "bg-slate-100 text-slate-600 border-slate-200"
                                  }`}
                                >
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full ${
                                      pkg.status === "ACTIVE"
                                        ? "bg-emerald-500"
                                        : "bg-slate-400"
                                    }`}
                                  />
                                  <span>{pkg.status}</span>
                                </button>
                              </td>

                              {/* Actions */}
                              <td className="py-3.5 px-4 sm:px-5 text-right">
                                {isParent ? (
                                  <div className="inline-flex items-center justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() => openQuickPriceEdit(pkg)}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white text-xs font-bold border border-indigo-200/80 shadow-xs transition-all cursor-pointer"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                      <span>Customise</span>
                                    </button>
                                  </div>
                                ) : (
                                  <div className="inline-flex items-center justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() => openQuickPriceEdit(pkg)}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white text-xs font-bold border border-indigo-200/80 shadow-xs transition-all cursor-pointer"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                      <span>Customise</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeletePackage(pkg)}
                                      title="Delete Package"
                                      className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => openEdit(pkg)}
                                      title="Edit Package Details"
                                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                                    >
                                      <SlidersHorizontal className="w-4 h-4" />
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );

                          if (isParent && isExpanded) {
                            pkg.subOptions.forEach((sub) => {
                              rows.push(
                                <tr key={sub.id} className="bg-slate-50/50 hover:bg-slate-100/60 transition-colors border-l-4 border-indigo-500">
                                  <td className="py-3.5 pl-12 pr-4 sm:pr-5">
                                    <div className="font-bold text-slate-700 text-xs">{sub.name}</div>
                                    <p className="text-[10px] text-slate-400 mt-0.5">{sub.description || "Sub-variant option"}</p>
                                  </td>
                                  <td className="py-3.5 px-4 sm:px-5">
                                    <span className="text-xs font-bold text-slate-600">₹{Math.round(Number(sub.base_price) || 0)}</span>
                                  </td>
                                  <td className="py-3.5 px-4 sm:px-5">
                                    {sub.tag ? <span className="text-[10px] bg-amber-50 border border-amber-200 text-amber-700 px-2 py-0.5 rounded font-bold">★ {sub.tag}</span> : "—"}
                                  </td>
                                  <td className="py-3.5 px-4 sm:px-5 text-slate-500 text-xs">
                                    {sub.duration}
                                  </td>
                                  <td className="py-3.5 px-4 sm:px-5">
                                    <button
                                      type="button"
                                      onClick={() => handleToggleStatus(sub)}
                                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${
                                        sub.status === "ACTIVE" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-slate-100 text-slate-600 border-slate-200"
                                      }`}
                                    >
                                      {sub.status}
                                    </button>
                                  </td>
                                  <td className="py-3.5 px-4 sm:px-5 text-right">
                                    <div className="inline-flex items-center justify-end gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => openQuickPriceEdit(sub)}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-[11px] font-bold border border-indigo-200/50 cursor-pointer"
                                      >
                                        <Edit2 className="w-3 h-3" />
                                        <span>Customise</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeletePackage(sub)}
                                        title="Delete Variant"
                                        className="p-1 text-slate-400 hover:text-rose-500 cursor-pointer"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => openEdit(sub)}
                                        className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                                      >
                                        <SlidersHorizontal className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            });
                          }

                          return rows;
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Sub-Service Customise Modal (Heading & Description) ── */}
      {serviceEditing && (
        <Modal
          maxWidth="max-w-2xl"
          title={`Customise Sub-Service: ${serviceEditing.name}`}
          onClose={() => setServiceEditing(null)}
        >
          <form onSubmit={handleServiceSave} className="flex flex-col gap-5 font-sans text-left">
            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50/70 rounded-2xl border border-indigo-100 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Category Pillar</span>
                <div className="text-sm sm:text-base font-extrabold text-indigo-950 mt-0.5">{activePillar.name}</div>
              </div>
              <span className="px-3 py-1 bg-white text-indigo-700 text-xs font-bold rounded-full border border-indigo-200/80 shadow-2xs">
                Live Module Header
              </span>
            </div>

            <div>
              <Input
                label="Sub-Service Name / Title"
                required
                placeholder="e.g. 2 Wheeler, Truck, Packers & Movers"
                value={serviceEditing.name || ""}
                onChange={(e) => setServiceEditing({ ...serviceEditing, name: e.target.value })}
              />
            </div>

            <div>
              <TextArea
                label="Sub-Service Description"
                placeholder="Describe this service category or delivery fleet capability..."
                value={serviceEditing.description || ""}
                onChange={(e) => setServiceEditing({ ...serviceEditing, description: e.target.value })}
              />
            </div>

            <div className="flex gap-3 justify-end mt-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setServiceEditing(null)}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-sm font-extrabold shadow-md shadow-indigo-600/20 transition-all cursor-pointer flex items-center gap-2"
              >
                <span>Save Sub-Service</span>
                <Check className="w-4 h-4" />
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Sub-Service Customise Modal (Heading, Description, Points, Badges, etc.) ── */}
      {serviceCustomizing && (
        <Modal
          maxWidth="max-w-3xl sm:max-w-4xl"
          title={`Customise Painting Service Page: ${serviceCustomizing.name}`}
          onClose={() => setServiceCustomizing(null)}
        >
          <form onSubmit={handleServiceCustomizerSave} className="flex flex-col gap-5 font-sans text-left">
            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50/70 rounded-2xl border border-indigo-100 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Category Pillar</span>
                <div className="text-sm sm:text-base font-extrabold text-indigo-955 mt-0.5">{activePillar.name}</div>
              </div>
              <span className="px-3 py-1 bg-white text-indigo-700 text-xs font-bold rounded-full border border-indigo-200/80 shadow-2xs">
                Painting Customizer
              </span>
            </div>

            {/* Tabs Header */}
            <div className="flex border-b border-slate-200">
              {[
                { id: "general", label: "Card & General Settings" },
                { id: "content", label: "Includes & Excludes" },
                { id: "details", label: "Badges, Steps & FAQs" },
                { id: "pricing", label: "Price List & Materials" },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setCustomizerTab(t.id)}
                  className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                    customizerTab === t.id
                      ? "border-indigo-600 text-indigo-600"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Tab 1: General & Card settings */}
            {customizerTab === "general" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Sub-Service Name"
                    required
                    value={serviceCustomizing.name || ""}
                    onChange={(e) => setServiceCustomizing({ ...serviceCustomizing, name: e.target.value })}
                  />
                  <Input
                    label="Display Order (sort_order)"
                    type="number"
                    value={serviceCustomizing.sort_order || 0}
                    onChange={(e) => setServiceCustomizing({ ...serviceCustomizing, sort_order: parseInt(e.target.value) || 0 })}
                  />
                </div>

                <TextArea
                  label="Description"
                  value={serviceCustomizing.description || ""}
                  onChange={(e) => setServiceCustomizing({ ...serviceCustomizing, description: e.target.value })}
                />

                {/* Service Image Customizer Section */}
                <div className="bg-slate-50/80 rounded-2xl p-4 sm:p-5 border border-slate-200/90 space-y-3">
                  <div>
                    <span className="text-xs font-bold text-slate-800">Service Banner Image</span>
                    <p className="text-[11px] text-slate-500 mt-0.5">Upload a custom service banner image or paste an image URL.</p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    {serviceCustomizing.image ? (
                      <div className="relative w-24 h-16 rounded-xl border border-slate-200 overflow-hidden bg-slate-100 flex-shrink-0 group">
                        <img src={serviceCustomizing.image} alt="Preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setServiceCustomizing((prev) => ({ ...prev, image: "" }))}
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-bold transition-opacity"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <div className="w-24 h-16 rounded-xl border border-dashed border-slate-300 flex items-center justify-center bg-slate-50 flex-shrink-0 text-slate-400 text-[10px] font-bold">
                        No Image
                      </div>
                    )}
                    <div className="flex-1 w-full space-y-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            const formData = new FormData()
                            formData.append("image", file)
                            try {
                              const res = await apiRequest("/settings/catalog/upload-image/", {
                                method: "POST",
                                body: formData,
                              })
                              if (res.success && res.url) {
                                setServiceCustomizing((prev) => ({ ...prev, image: res.url }))
                                showToast("Image uploaded successfully!")
                              } else {
                                showToast(res.message || "Upload failed", "error")
                              }
                            } catch (err) {
                              showToast("Upload failed", "error")
                            }
                          }
                        }}
                        className="block w-full text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-[10px] file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                      />
                      <Input
                        label="Or Image URL"
                        placeholder="https://images.unsplash.com/..."
                        value={serviceCustomizing.image || ""}
                        onChange={(e) => setServiceCustomizing({ ...serviceCustomizing, image: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Input
                    label="Marketing Rating"
                    value={serviceCustomizing.customization.rating || "4.8"}
                    onChange={(e) => {
                      const updatedCust = { ...serviceCustomizing.customization, rating: e.target.value };
                      setServiceCustomizing({ ...serviceCustomizing, customization: updatedCust });
                    }}
                  />
                  <Input
                    label="Marketing Rating Count"
                    placeholder="e.g. 15K Ratings, 2.5 Lakhs"
                    value={serviceCustomizing.customization.reviews || "15K"}
                    onChange={(e) => {
                      const updatedCust = { ...serviceCustomizing.customization, reviews: e.target.value };
                      setServiceCustomizing({ ...serviceCustomizing, customization: updatedCust });
                    }}
                  />
                  <Input
                    label="Ratings & Reviews Section Heading"
                    value={serviceCustomizing.customization.reviews_heading || "Ratings & Reviews"}
                    onChange={(e) => {
                      const updatedCust = { ...serviceCustomizing.customization, reviews_heading: e.target.value };
                      setServiceCustomizing({ ...serviceCustomizing, customization: updatedCust });
                    }}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Input
                    label="View Details Button Text"
                    value={serviceCustomizing.customization.button_text || "View details"}
                    onChange={(e) => {
                      const updatedCust = { ...serviceCustomizing.customization, button_text: e.target.value };
                      setServiceCustomizing({ ...serviceCustomizing, customization: updatedCust });
                    }}
                  />
                  <Input
                    label="Get Estimate Button CTA"
                    value={serviceCustomizing.customization.estimate_cta || "Get Estimate"}
                    onChange={(e) => {
                      const updatedCust = { ...serviceCustomizing.customization, estimate_cta: e.target.value };
                      setServiceCustomizing({ ...serviceCustomizing, customization: updatedCust });
                    }}
                  />
                  <Input
                    label="Override Starting Fare"
                    type="number"
                    value={serviceCustomizing.customization.starting_fare || ""}
                    onChange={(e) => {
                      const updatedCust = { ...serviceCustomizing.customization, starting_fare: e.target.value };
                      setServiceCustomizing({ ...serviceCustomizing, customization: updatedCust });
                    }}
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!serviceCustomizing.is_active}
                      onChange={(e) => setServiceCustomizing({ ...serviceCustomizing, is_active: e.target.checked })}
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                    <span>Active in Customer Booking</span>
                  </label>
                </div>

                {/* Card Points repeatable list */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Card Points (Short highlights on the service card)</label>
                  <div className="space-y-2 mb-2 max-h-40 overflow-y-auto border border-slate-200 rounded-xl p-2 bg-slate-50">
                    {serviceCustomizing.customization.points.map((pt, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={pt}
                          onChange={(e) => {
                            const updated = [...serviceCustomizing.customization.points];
                            updated[idx] = e.target.value;
                            setServiceCustomizing({
                              ...serviceCustomizing,
                              customization: { ...serviceCustomizing.customization, points: updated }
                            });
                          }}
                          className="flex-1 text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const updated = serviceCustomizing.customization.points.filter((_, i) => i !== idx);
                            setServiceCustomizing({
                              ...serviceCustomizing,
                              customization: { ...serviceCustomizing.customization, points: updated }
                            });
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {serviceCustomizing.customization.points.length === 0 && (
                      <p className="text-[11px] text-slate-400 italic">No points configured. Default fallbacks will be used.</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setServiceCustomizing({
                        ...serviceCustomizing,
                        customization: {
                          ...serviceCustomizing.customization,
                          points: [...serviceCustomizing.customization.points, ""]
                        }
                      });
                    }}
                    className="text-[11px] font-bold text-indigo-600 hover:underline cursor-pointer"
                  >
                    + Add Card Point
                  </button>
                </div>
              </div>
            )}

            {/* Tab 2: Includes & Excludes */}
            {customizerTab === "content" && (
              <div className="space-y-5">
                {/* SUB-OPTIONS SECTION */}
                <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-3">
                  <span className="text-xs font-bold text-slate-800">Sub-Options List Heading (e.g. What would you like to inspect?)</span>
                  <Input
                    label="Section Heading"
                    value={serviceCustomizing.customization.suboptions_heading || ""}
                    placeholder="What Would You Like to Inspect?"
                    onChange={(e) => {
                      const updatedCust = { ...serviceCustomizing.customization, suboptions_heading: e.target.value };
                      setServiceCustomizing({ ...serviceCustomizing, customization: updatedCust });
                    }}
                  />
                </div>

                {/* WHAT'S INCLUDED */}
                <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-800">What's Included Section</span>
                  </div>
                  <Input
                    label="Section Heading"
                    value={serviceCustomizing.customization.includes_heading || "WHAT'S INCLUDED"}
                    onChange={(e) => {
                      const updatedCust = { ...serviceCustomizing.customization, includes_heading: e.target.value };
                      setServiceCustomizing({ ...serviceCustomizing, customization: updatedCust });
                    }}
                  />
                  <div className="space-y-2 max-h-40 overflow-y-auto border border-slate-200 rounded-xl p-2 bg-white">
                    {serviceCustomizing.customization.includes.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={item}
                          onChange={(e) => {
                            const updated = [...serviceCustomizing.customization.includes];
                            updated[idx] = e.target.value;
                            setServiceCustomizing({
                              ...serviceCustomizing,
                              customization: { ...serviceCustomizing.customization, includes: updated }
                            });
                          }}
                          className="flex-1 text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const updated = serviceCustomizing.customization.includes.filter((_, i) => i !== idx);
                            setServiceCustomizing({
                              ...serviceCustomizing,
                              customization: { ...serviceCustomizing.customization, includes: updated }
                            });
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {serviceCustomizing.customization.includes.length === 0 && (
                      <p className="text-[11px] text-slate-400 italic">No included items. Default fallbacks will be used.</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setServiceCustomizing({
                        ...serviceCustomizing,
                        customization: {
                          ...serviceCustomizing.customization,
                          includes: [...serviceCustomizing.customization.includes, ""]
                        }
                      });
                    }}
                    className="text-[11px] font-bold text-indigo-600 hover:underline cursor-pointer"
                  >
                    + Add Included Item
                  </button>
                </div>

                {/* WHAT'S NOT INCLUDED */}
                <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-800">What's Not Included Section</span>
                    <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={!!serviceCustomizing.customization.excludes_enabled}
                        onChange={(e) => {
                          const updatedCust = { ...serviceCustomizing.customization, excludes_enabled: e.target.checked };
                          setServiceCustomizing({ ...serviceCustomizing, customization: updatedCust });
                        }}
                        className="w-3.5 h-3.5 text-indigo-600 rounded"
                      />
                      <span>Enable Section</span>
                    </label>
                  </div>
                  <Input
                    label="Section Heading"
                    disabled={!serviceCustomizing.customization.excludes_enabled}
                    value={serviceCustomizing.customization.excludes_heading || "WHAT'S NOT INCLUDED"}
                    onChange={(e) => {
                      const updatedCust = { ...serviceCustomizing.customization, excludes_heading: e.target.value };
                      setServiceCustomizing({ ...serviceCustomizing, customization: updatedCust });
                    }}
                  />
                  <div className="space-y-2 max-h-40 overflow-y-auto border border-slate-200 rounded-xl p-2 bg-white">
                    {serviceCustomizing.customization.excludes.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          disabled={!serviceCustomizing.customization.excludes_enabled}
                          value={item}
                          onChange={(e) => {
                            const updated = [...serviceCustomizing.customization.excludes];
                            updated[idx] = e.target.value;
                            setServiceCustomizing({
                              ...serviceCustomizing,
                              customization: { ...serviceCustomizing.customization, excludes: updated }
                            });
                          }}
                          className="flex-1 text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white disabled:bg-slate-100 disabled:text-slate-400"
                        />
                        <button
                          type="button"
                          disabled={!serviceCustomizing.customization.excludes_enabled}
                          onClick={() => {
                            const updated = serviceCustomizing.customization.excludes.filter((_, i) => i !== idx);
                            setServiceCustomizing({
                              ...serviceCustomizing,
                              customization: { ...serviceCustomizing.customization, excludes: updated }
                            });
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {serviceCustomizing.customization.excludes.length === 0 && (
                      <p className="text-[11px] text-slate-400 italic">No excluded items. Default fallbacks will be used.</p>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={!serviceCustomizing.customization.excludes_enabled}
                    onClick={() => {
                      setServiceCustomizing({
                        ...serviceCustomizing,
                        customization: {
                          ...serviceCustomizing.customization,
                          excludes: [...serviceCustomizing.customization.excludes, ""]
                        }
                      });
                    }}
                    className="text-[11px] font-bold text-indigo-600 hover:underline cursor-pointer disabled:opacity-50"
                  >
                    + Add Excluded Item
                  </button>
                </div>

                {/* FREE SITE INSPECTION */}
                <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-800">Free Site Inspection Banner Section</span>
                    <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={!!serviceCustomizing.customization.free_inspection_enabled}
                        onChange={(e) => {
                          const updatedCust = { ...serviceCustomizing.customization, free_inspection_enabled: e.target.checked };
                          setServiceCustomizing({ ...serviceCustomizing, customization: updatedCust });
                        }}
                        className="w-3.5 h-3.5 text-indigo-600 rounded"
                      />
                      <span>Enable Section</span>
                    </label>
                  </div>
                  <Input
                    label="Section Heading"
                    disabled={!serviceCustomizing.customization.free_inspection_enabled}
                    value={serviceCustomizing.customization.free_inspection_heading || "FREE SITE INSPECTION INCLUDED"}
                    onChange={(e) => {
                      const updatedCust = { ...serviceCustomizing.customization, free_inspection_heading: e.target.value };
                      setServiceCustomizing({ ...serviceCustomizing, customization: updatedCust });
                    }}
                  />
                  <div className="space-y-2 max-h-40 overflow-y-auto border border-slate-200 rounded-xl p-2 bg-white">
                    {serviceCustomizing.customization.inspection_highlights.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          disabled={!serviceCustomizing.customization.free_inspection_enabled}
                          value={item}
                          onChange={(e) => {
                            const updated = [...serviceCustomizing.customization.inspection_highlights];
                            updated[idx] = e.target.value;
                            setServiceCustomizing({
                              ...serviceCustomizing,
                              customization: { ...serviceCustomizing.customization, inspection_highlights: updated }
                            });
                          }}
                          className="flex-1 text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white disabled:bg-slate-100 disabled:text-slate-400"
                        />
                        <button
                          type="button"
                          disabled={!serviceCustomizing.customization.free_inspection_enabled}
                          onClick={() => {
                            const updated = serviceCustomizing.customization.inspection_highlights.filter((_, i) => i !== idx);
                            setServiceCustomizing({
                              ...serviceCustomizing,
                              customization: { ...serviceCustomizing.customization, inspection_highlights: updated }
                            });
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {serviceCustomizing.customization.inspection_highlights.length === 0 && (
                      <p className="text-[11px] text-slate-400 italic">No tags configured. Default fallbacks will be used.</p>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={!serviceCustomizing.customization.free_inspection_enabled}
                    onClick={() => {
                      setServiceCustomizing({
                        ...serviceCustomizing,
                        customization: {
                          ...serviceCustomizing.customization,
                          inspection_highlights: [...serviceCustomizing.customization.inspection_highlights, ""]
                        }
                      });
                    }}
                    className="text-[11px] font-bold text-indigo-600 hover:underline cursor-pointer disabled:opacity-50"
                  >
                    + Add Highlight Tag
                  </button>
                </div>
              </div>
            )}

            {/* Tab 3: Badges, Steps & FAQs */}
            {customizerTab === "details" && (
              <div className="space-y-5">
                {/* FEATURE BADGES */}
                <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-3">
                  <span className="text-xs font-bold text-slate-800 block">Feature Badges (Switch Board popup badges)</span>
                  <div className="space-y-3 max-h-48 overflow-y-auto border border-slate-200 rounded-xl p-2 bg-white">
                    {serviceCustomizing.customization.benefits.map((badge, idx) => {
                      const bTitle = typeof badge === 'string' ? badge : (badge.title || "");
                      const bIcon = typeof badge === 'string' ? "award" : (badge.icon || "award");
                      return (
                        <div key={idx} className="bg-slate-50/50 border border-slate-200 rounded-lg p-2.5 space-y-2 relative">
                          <div className="grid grid-cols-2 gap-3">
                            <Input
                              label="Badge Title"
                              value={bTitle}
                              onChange={(e) => {
                                const updated = [...serviceCustomizing.customization.benefits];
                                updated[idx] = { title: e.target.value, icon: bIcon };
                                setServiceCustomizing({
                                  ...serviceCustomizing,
                                  customization: { ...serviceCustomizing.customization, benefits: updated }
                                });
                              }}
                            />
                            <Input
                              label="Badge Icon (e.g. star, shield, award, cpu)"
                              value={bIcon}
                              onChange={(e) => {
                                const updated = [...serviceCustomizing.customization.benefits];
                                updated[idx] = { title: bTitle, icon: e.target.value };
                                setServiceCustomizing({
                                  ...serviceCustomizing,
                                  customization: { ...serviceCustomizing.customization, benefits: updated }
                                });
                              }}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = serviceCustomizing.customization.benefits.filter((_, i) => i !== idx);
                              setServiceCustomizing({
                               ...serviceCustomizing,
                               customization: { ...serviceCustomizing.customization, benefits: updated }
                              });
                            }}
                            className="absolute top-1 right-1 p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                    {serviceCustomizing.customization.benefits.length === 0 && (
                      <p className="text-[11px] text-slate-400 italic">No badges configured. Default fallbacks will be used.</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setServiceCustomizing({
                        ...serviceCustomizing,
                        customization: {
                          ...serviceCustomizing.customization,
                          benefits: [...serviceCustomizing.customization.benefits, { title: "", icon: "award" }]
                        }
                      });
                    }}
                    className="text-[11px] font-bold text-indigo-600 hover:underline cursor-pointer"
                  >
                    + Add Feature Badge
                  </button>
                </div>

                {/* HOW IT WORKS */}
                <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-3">
                  <span className="text-xs font-bold text-slate-800 block">How it Works Section</span>
                  <Input
                    label="Section Heading"
                    value={serviceCustomizing.customization.steps_heading || "HOW PAINTING WORKS"}
                    onChange={(e) => {
                      const updatedCust = { ...serviceCustomizing.customization, steps_heading: e.target.value };
                      setServiceCustomizing({ ...serviceCustomizing, customization: updatedCust });
                    }}
                  />
                  <div className="space-y-3 max-h-56 overflow-y-auto border border-slate-200 rounded-xl p-2 bg-white">
                    {serviceCustomizing.customization.steps.map((step, idx) => (
                      <div key={idx} className="bg-slate-50/50 border border-slate-200 rounded-lg p-2.5 space-y-2 relative">
                        <div className="grid grid-cols-2 gap-3">
                          <Input
                            label="Step Title"
                            value={step.title || ""}
                            onChange={(e) => {
                              const updated = [...serviceCustomizing.customization.steps];
                              updated[idx] = { ...step, title: e.target.value };
                              setServiceCustomizing({
                                ...serviceCustomizing,
                                customization: { ...serviceCustomizing.customization, steps: updated }
                              });
                            }}
                          />
                          <Input
                            label="Step Icon (e.g. calendar, cpu, paint-roller, check-circle)"
                            value={step.icon || ""}
                            onChange={(e) => {
                              const updated = [...serviceCustomizing.customization.steps];
                              updated[idx] = { ...step, icon: e.target.value };
                              setServiceCustomizing({
                                ...serviceCustomizing,
                                customization: { ...serviceCustomizing.customization, steps: updated }
                              });
                            }}
                          />
                        </div>
                        <TextArea
                          label="Step Description"
                          rows={2}
                          value={step.desc || ""}
                          onChange={(e) => {
                            const updated = [...serviceCustomizing.customization.steps];
                            updated[idx] = { ...step, desc: e.target.value };
                            setServiceCustomizing({
                              ...serviceCustomizing,
                              customization: { ...serviceCustomizing.customization, steps: updated }
                            });
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const updated = serviceCustomizing.customization.steps.filter((_, i) => i !== idx);
                            setServiceCustomizing({
                              ...serviceCustomizing,
                              customization: { ...serviceCustomizing.customization, steps: updated }
                            });
                          }}
                          className="absolute top-1 right-1 p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    {serviceCustomizing.customization.steps.length === 0 && (
                      <p className="text-[11px] text-slate-400 italic">No steps configured. Default fallbacks will be used.</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setServiceCustomizing({
                        ...serviceCustomizing,
                        customization: {
                          ...serviceCustomizing.customization,
                          steps: [...serviceCustomizing.customization.steps, { title: "", desc: "", icon: "paint-roller" }]
                        }
                      });
                    }}
                    className="text-[11px] font-bold text-indigo-600 hover:underline cursor-pointer"
                  >
                    + Add Step
                  </button>
                </div>

                {/* FAQ */}
                <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-3">
                  <span className="text-xs font-bold text-slate-800 block">Frequently Asked Questions (FAQ)</span>
                  <Input
                    label="FAQ Section Heading"
                    value={serviceCustomizing.customization.faqs_heading || ""}
                    placeholder="Frequently Asked Questions"
                    onChange={(e) => {
                      const updatedCust = { ...serviceCustomizing.customization, faqs_heading: e.target.value };
                      setServiceCustomizing({ ...serviceCustomizing, customization: updatedCust });
                    }}
                  />
                  <div className="space-y-3 max-h-56 overflow-y-auto border border-slate-200 rounded-xl p-2 bg-white">
                    {serviceCustomizing.customization.faqs.map((faq, idx) => (
                      <div key={idx} className="bg-slate-50/50 border border-slate-200 rounded-lg p-2.5 space-y-2 relative">
                        <Input
                          label="Question"
                          value={faq.q || faq.question || ""}
                          onChange={(e) => {
                            const updated = [...serviceCustomizing.customization.faqs];
                            updated[idx] = { ...faq, q: e.target.value, question: e.target.value };
                            setServiceCustomizing({
                              ...serviceCustomizing,
                              customization: { ...serviceCustomizing.customization, faqs: updated }
                            });
                          }}
                        />
                        <TextArea
                          label="Answer"
                          rows={2}
                          value={faq.a || faq.answer || ""}
                          onChange={(e) => {
                            const updated = [...serviceCustomizing.customization.faqs];
                            updated[idx] = { ...faq, a: e.target.value, answer: e.target.value };
                            setServiceCustomizing({
                              ...serviceCustomizing,
                              customization: { ...serviceCustomizing.customization, faqs: updated }
                            });
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const updated = serviceCustomizing.customization.faqs.filter((_, i) => i !== idx);
                            setServiceCustomizing({
                              ...serviceCustomizing,
                              customization: { ...serviceCustomizing.customization, faqs: updated }
                            });
                          }}
                          className="absolute top-1 right-1 p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    {serviceCustomizing.customization.faqs.length === 0 && (
                      <p className="text-[11px] text-slate-400 italic">No FAQs configured. Default fallbacks will be used.</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setServiceCustomizing({
                        ...serviceCustomizing,
                        customization: {
                          ...serviceCustomizing.customization,
                          faqs: [...serviceCustomizing.customization.faqs, { q: "", a: "", active: true }]
                        }
                      });
                    }}
                    className="text-[11px] font-bold text-indigo-600 hover:underline cursor-pointer"
                  >
                    + Add FAQ Question
                  </button>
                </div>
              </div>
            )}

            {customizerTab === "pricing" && (
              <div className="space-y-5">
                {/* Informative Price List */}
                <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-800 block">Price List Table (Shown in "View Price List" dropdown)</span>
                    <button
                      type="button"
                      onClick={() => {
                        const updatedList = [...(serviceCustomizing.customization.price_list || [])];
                        updatedList.push({ type: "", price: "" });
                        setServiceCustomizing({
                          ...serviceCustomizing,
                          customization: { ...serviceCustomizing.customization, price_list: updatedList }
                        });
                      }}
                      className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-750 border border-indigo-200 text-[10px] font-bold rounded-xl cursor-pointer"
                    >
                      + Add Row
                    </button>
                  </div>
                  <div className="space-y-3 max-h-60 overflow-y-auto border border-slate-200 rounded-xl p-2.5 bg-white">
                    {(!serviceCustomizing.customization.price_list || serviceCustomizing.customization.price_list.length === 0) ? (
                      <span className="text-xs text-slate-400 block text-center py-2">No custom prices configured. Default fallbacks will be used.</span>
                    ) : (
                      serviceCustomizing.customization.price_list.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2.5 bg-slate-50/40 border border-slate-200 p-2 rounded-xl relative">
                          <Input
                            label="Paint/Service Type"
                            placeholder="e.g. Economy Exterior"
                            value={item.type || ""}
                            onChange={(e) => {
                              const updated = [...serviceCustomizing.customization.price_list];
                              updated[idx] = { ...item, type: e.target.value };
                              setServiceCustomizing({
                                ...serviceCustomizing,
                                customization: { ...serviceCustomizing.customization, price_list: updated }
                              });
                            }}
                          />
                          <Input
                            label="Rate Label"
                            placeholder="e.g. ₹15/sq.ft"
                            value={item.price || ""}
                            onChange={(e) => {
                              const updated = [...serviceCustomizing.customization.price_list];
                              updated[idx] = { ...item, price: e.target.value };
                              setServiceCustomizing({
                                ...serviceCustomizing,
                                customization: { ...serviceCustomizing.customization, price_list: updated }
                              });
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const updated = serviceCustomizing.customization.price_list.filter((_, i) => i !== idx);
                              setServiceCustomizing({
                                ...serviceCustomizing,
                                customization: { ...serviceCustomizing.customization, price_list: updated }
                              });
                            }}
                            className="p-1.5 mt-4 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-100 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Option / Material Types */}
                <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-800 block">Calculation Material/Option Types (Shown as Selection Boxes)</span>
                    <button
                      type="button"
                      onClick={() => {
                        const updatedList = [...(serviceCustomizing.customization.paint_types || [])];
                        updatedList.push({ id: "", name: "", price: 0, type: "", image: "" });
                        setServiceCustomizing({
                          ...serviceCustomizing,
                          customization: { ...serviceCustomizing.customization, paint_types: updatedList }
                        });
                      }}
                      className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-750 border border-indigo-200 text-[10px] font-bold rounded-xl cursor-pointer"
                    >
                      + Add Material
                    </button>
                  </div>
                  <div className="space-y-3 max-h-80 overflow-y-auto border border-slate-200 rounded-xl p-2.5 bg-white">
                    {(!serviceCustomizing.customization.paint_types || serviceCustomizing.customization.paint_types.length === 0) ? (
                      <span className="text-xs text-slate-400 block text-center py-2">No custom material options configured. Default fallbacks will be used.</span>
                    ) : (
                      serviceCustomizing.customization.paint_types.map((item, idx) => (
                        <div key={idx} className="bg-slate-50/30 border border-slate-200 p-3 rounded-xl space-y-2 relative">
                          <div className="grid grid-cols-2 gap-2.5">
                            <Input
                              label="Material Name"
                              placeholder="e.g. Tractor UNO"
                              value={item.name || ""}
                              onChange={(e) => {
                                const updated = [...serviceCustomizing.customization.paint_types];
                                const autoId = e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
                                updated[idx] = { ...item, name: e.target.value, id: autoId };
                                setServiceCustomizing({
                                  ...serviceCustomizing,
                                  customization: { ...serviceCustomizing.customization, paint_types: updated }
                                });
                              }}
                            />
                            <Input
                              label="Grade / Category Label"
                              placeholder="e.g. Economy, Premium"
                              value={item.type || ""}
                              onChange={(e) => {
                                const updated = [...serviceCustomizing.customization.paint_types];
                                updated[idx] = { ...item, type: e.target.value };
                                setServiceCustomizing({
                                  ...serviceCustomizing,
                                  customization: { ...serviceCustomizing.customization, paint_types: updated }
                                });
                              }}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2.5">
                            <Input
                              label="Rate per sq.ft (Number)"
                              type="number"
                              placeholder="e.g. 7"
                              value={item.price || ""}
                              onChange={(e) => {
                                const updated = [...serviceCustomizing.customization.paint_types];
                                updated[idx] = { ...item, price: parseFloat(e.target.value) || 0 };
                                setServiceCustomizing({
                                  ...serviceCustomizing,
                                  customization: { ...serviceCustomizing.customization, paint_types: updated }
                                });
                              }}
                            />
                            <Input
                              label="Image URL"
                              placeholder="e.g. /tractor-uno.png"
                              value={item.image || ""}
                              onChange={(e) => {
                                const updated = [...serviceCustomizing.customization.paint_types];
                                updated[idx] = { ...item, image: e.target.value };
                                setServiceCustomizing({
                                  ...serviceCustomizing,
                                  customization: { ...serviceCustomizing.customization, paint_types: updated }
                                });
                              }}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = serviceCustomizing.customization.paint_types.filter((_, i) => i !== idx);
                              setServiceCustomizing({
                                ...serviceCustomizing,
                                customization: { ...serviceCustomizing.customization, paint_types: updated }
                              });
                            }}
                            className="absolute top-2 right-2 p-1 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-100 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3 justify-end mt-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setServiceCustomizing(null)}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-sm font-extrabold shadow-md shadow-indigo-600/20 transition-all cursor-pointer flex items-center gap-2"
              >
                <span>Save &amp; Publish Live</span>
                <Check className="w-4 h-4" />
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Customise Package Modal (Heading, Description, Price, Tag, Duration) ── */}
      {quickPriceEditing && (
        <Modal
          maxWidth="max-w-2xl sm:max-w-3xl"
          title={`Customise: ${quickPriceEditing.name}`}
          onClose={() => setQuickPriceEditing(null)}
        >
          <form onSubmit={handleQuickPriceSave} className="flex flex-col gap-5 font-sans text-left">
            <div className="p-4 bg-gradient-to-r from-blue-50 via-indigo-50/50 to-blue-50/70 rounded-2xl border border-indigo-100/90 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Service Category</span>
                <div className="text-sm sm:text-base font-extrabold text-indigo-950 mt-0.5">
                  {(() => {
                    const currentSubService = activeCategoryServicesWithPackages.find(
                      (item) =>
                        item.service.slug === activeSubServiceKey ||
                        item.service.virtualSlug === activeSubServiceKey ||
                        String(item.service.id) === String(activeSubServiceKey) ||
                        String(item.service.realServiceId) === String(activeSubServiceKey) ||
                        item.displayName.toLowerCase().replace(/[^a-z0-9]/g, "") === activeSubServiceKey.toLowerCase().replace(/[^a-z0-9]/g, "")
                    );
                    if (currentSubService) {
                      return currentSubService.displayName;
                    }
                    return quickPriceEditing.service_name || activePillar.name;
                  })()}
                </div>
              </div>
              <span className="px-3 py-1 bg-white text-indigo-700 text-xs font-bold rounded-full border border-indigo-200/80 shadow-2xs">
                Live Sync Enabled
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Package Heading / Vehicle Name"
                required
                placeholder="e.g. 1.7 ton (1700 kg), 2 Wheeler Electric / Express"
                value={quickPriceEditing.name || ""}
                onChange={(e) =>
                  setQuickPriceEditing({ ...quickPriceEditing, name: e.target.value })
                }
              />
              <Input
                label="Starting Fare / Base Price (₹)"
                type="number"
                required
                placeholder="e.g. 380"
                value={quickPriceEditing.base_price}
                onChange={(e) =>
                  setQuickPriceEditing({ ...quickPriceEditing, base_price: e.target.value })
                }
              />
              <Input
                label="Time / Duration"
                required
                placeholder="e.g. 1.5 hrs, 2 hrs, 45 mins"
                value={quickPriceEditing.duration || ""}
                onChange={(e) =>
                  setQuickPriceEditing({ ...quickPriceEditing, duration: e.target.value })
                }
              />
            </div>

            <div>
              <TextArea
                label="Description (shown on customer booking cards & info modals)"
                placeholder="Describe this vehicle payload, bed dimensions, or service details..."
                value={quickPriceEditing.description || ""}
                onChange={(e) =>
                  setQuickPriceEditing({ ...quickPriceEditing, description: e.target.value })
                }
              />
            </div>

            {(activeCategoryKey === "paintings" || activeCategoryKey === "mason") && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="Display Order (sort_order)"
                  type="number"
                  placeholder="e.g. 1"
                  value={quickPriceEditing.sort_order || 0}
                  onChange={(e) =>
                    setQuickPriceEditing({ ...quickPriceEditing, sort_order: parseInt(e.target.value) || 0 })
                  }
                />
                <Input
                  label="Button Text"
                  placeholder="e.g. Add"
                  value={quickPriceEditing.button_text || "Add"}
                  onChange={(e) =>
                    setQuickPriceEditing({ ...quickPriceEditing, button_text: e.target.value })
                  }
                />
                <Input
                  label="Icon (e.g. paint-roller, check-circle)"
                  placeholder="e.g. paint-roller"
                  value={quickPriceEditing.icon || ""}
                  onChange={(e) =>
                    setQuickPriceEditing({ ...quickPriceEditing, icon: e.target.value })
                  }
                />
              </div>
            )}

            {/* ── Suitable for / Know More Checklist Section (Blue Shade Theme) ── */}
            <div className="bg-gradient-to-b from-blue-50/50 to-slate-50/70 rounded-2xl p-4 sm:p-5 border border-blue-100/90 space-y-3.5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">
                      Suitable for / &ldquo;Know More&rdquo; Checklist
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-extrabold bg-blue-100 text-blue-800 rounded-full border border-blue-200/90 shadow-2xs">
                      {quickPriceEditing.checklist?.filter((i) => i.checked).length || 0} Ticked
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Tick items to display in the customer &ldquo;Know More&rdquo; modal. Untick to hide. Add custom items below.
                  </p>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1 scrollbar-thin">
                {quickPriceEditing.checklist && quickPriceEditing.checklist.length > 0 ? (
                  quickPriceEditing.checklist.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className={`flex items-center justify-between gap-3 p-2.5 rounded-xl border transition-all ${
                        item.checked
                          ? "bg-white border-blue-200 hover:border-blue-300 shadow-2xs"
                          : "bg-slate-50 border-slate-200 opacity-80"
                      }`}
                    >
                      <label className="flex items-center gap-2.5 flex-1 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={item.checked}
                          onChange={() => {
                            const updated = quickPriceEditing.checklist.map((ci) =>
                              ci.id === item.id ? { ...ci, checked: !ci.checked } : ci
                            )
                            setQuickPriceEditing({ ...quickPriceEditing, checklist: updated })
                          }}
                          className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer accent-blue-600"
                        />
                        {quickPriceEditing.editingItemId === item.id ? (
                          <input
                            type="text"
                            value={item.text}
                            onChange={(e) => {
                              const updated = quickPriceEditing.checklist.map((ci) =>
                                ci.id === item.id ? { ...ci, text: e.target.value } : ci
                              )
                              setQuickPriceEditing({ ...quickPriceEditing, checklist: updated })
                            }}
                            onBlur={() => setQuickPriceEditing({ ...quickPriceEditing, editingItemId: null })}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                setQuickPriceEditing({ ...quickPriceEditing, editingItemId: null })
                              }
                            }}
                            autoFocus
                            className="bg-white border border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 rounded px-1.5 py-0.5 text-xs font-semibold flex-1 text-slate-800"
                          />
                        ) : (
                          <span
                            onClick={() => {
                              // By request, clicking the row text directly does not trigger edit, must click the edit icon.
                              // Clicking the checkbox still toggles, but span does nothing.
                            }}
                            className={`text-xs font-semibold px-1.5 py-0.5 flex-1 select-none ${
                              item.checked ? "text-slate-800" : "text-slate-400"
                            }`}
                          >
                            {item.text}
                          </span>
                        )}
                      </label>

                      <div className="flex items-center gap-1">
                        {/* Edit indicator/button */}
                        <button
                          type="button"
                          onClick={() => {
                            setQuickPriceEditing({
                              ...quickPriceEditing,
                              editingItemId: item.id
                            })
                          }}
                          title="Rename item"
                          className={`p-1 rounded-lg transition-colors cursor-pointer ${
                            quickPriceEditing.editingItemId === item.id
                              ? "text-blue-600 bg-blue-50"
                              : "text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                          }`}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                      {/* Remove item button */}
                      <button
                        type="button"
                        onClick={() => {
                          const updated = quickPriceEditing.checklist.filter((ci) => ci.id !== item.id)
                          setQuickPriceEditing({ ...quickPriceEditing, checklist: updated })
                        }}
                        title="Remove item"
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic py-2 text-center">No checklist items added yet.</p>
                )}
              </div>

              {/* Add New Item Row */}
              <div className="flex items-center gap-2 pt-2 border-t border-blue-100">
                <input
                  type="text"
                  placeholder="Type new item (e.g. Fragile glassware, Heavy pallet items)..."
                  value={newItemText}
                  onChange={(e) => setNewItemText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      if (newItemText.trim()) {
                        const newItem = {
                          id: `custom-${Date.now()}`,
                          text: newItemText.trim(),
                          checked: true,
                        }
                        setQuickPriceEditing({
                          ...quickPriceEditing,
                          checklist: [...(quickPriceEditing.checklist || []), newItem],
                        })
                        setNewItemText("")
                      }
                    }
                  }}
                  className="flex-1 h-9 px-3 rounded-xl border border-blue-200/80 bg-white text-xs font-medium text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newItemText.trim()) {
                      const newItem = {
                        id: `custom-${Date.now()}`,
                        text: newItemText.trim(),
                        checked: true,
                      }
                      setQuickPriceEditing({
                        ...quickPriceEditing,
                        checklist: [...(quickPriceEditing.checklist || []), newItem],
                      })
                      setNewItemText("")
                    }
                  }}
                  className="h-9 px-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Item</span>
                </button>
              </div>
            </div>

            {/* ── Highlight / Popularity Badge Customization Section ── */}
            <div className="bg-slate-50/80 rounded-2xl p-4 sm:p-5 border border-slate-200/90 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">
                      Highlight / Popularity Badge
                    </span>
                    {quickPriceEditing.tag ? (
                      <span className="px-2 py-0.5 text-[10px] font-extrabold bg-amber-50 text-amber-800 rounded-full border border-amber-200 shadow-2xs">
                        Active: {quickPriceEditing.tag}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-500 rounded-full border border-slate-200">
                        No Badge (Hidden on Service Page)
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Click a badge preset or type custom text. If set, it will be displayed on the customer service card. If cleared, no badge is shown.
                  </p>
                </div>
              </div>

              {/* Quick Select Pills */}
              <div className="flex flex-wrap gap-2 pt-1">
                {[
                  { label: "★ Popular", val: "Popular", tone: "bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100" },
                  { label: "📦 Rarely Used", val: "Rarely Used", tone: "bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200" },
                  { label: "⚡ Best Seller", val: "Best Seller", tone: "bg-indigo-50 text-indigo-800 border-indigo-300 hover:bg-indigo-100" },
                  { label: "🔥 Trending", val: "Trending", tone: "bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100" },
                  { label: "✕ None (Clear)", val: "", tone: "bg-white text-slate-600 border-slate-200 hover:bg-slate-50" },
                ].map((opt) => (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() =>
                      setQuickPriceEditing({
                        ...quickPriceEditing,
                        tag: opt.val,
                        popular: opt.val === "Popular",
                      })
                    }
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      (quickPriceEditing.tag || "") === opt.val
                        ? "ring-2 ring-indigo-500 shadow-xs " + opt.tone
                        : opt.tone
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Custom Input */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <Input
                  label="Custom Badge Text"
                  placeholder="e.g. Popular, Rarely Used, Most Booked..."
                  value={quickPriceEditing.tag || ""}
                  onChange={(e) =>
                    setQuickPriceEditing({
                      ...quickPriceEditing,
                      tag: e.target.value,
                      popular: e.target.value.toLowerCase().includes("popular"),
                    })
                  }
                />
                <Input
                  label={activeCategoryKey === "goods_transports" ? "Duration of Badge Display (e.g. 30 days, 6 months, 1 yr)" : "Duration / ETA (e.g. 15 mins, 30 mins)"}
                  placeholder={activeCategoryKey === "goods_transports" ? "e.g. 30 days, 6 months, 1 yr" : "e.g. 15 mins"}
                  value={quickPriceEditing.duration || ""}
                  onChange={(e) =>
                    setQuickPriceEditing({ ...quickPriceEditing, duration: e.target.value })
                  }
                />
              </div>
            </div>

            {/* ── Image Customization Section ── */}
            <div className="bg-slate-50/80 rounded-2xl p-4 sm:p-5 border border-slate-200/90 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-bold text-slate-800">
                    Package Image
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Upload a custom package image or paste an image URL. Fits automatically to size and ratio.
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                {quickPriceEditing.image ? (
                  <div className="relative w-20 h-20 rounded-xl border border-slate-200 overflow-hidden bg-slate-100 flex-shrink-0 group">
                    <img src={quickPriceEditing.image} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setQuickPriceEditing((prev) => ({ ...prev, image: "" }))}
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-bold transition-opacity"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-xl border border-dashed border-slate-300 flex items-center justify-center bg-slate-50 flex-shrink-0 text-slate-400 text-[10px] font-bold">
                    No Image
                  </div>
                )}
                <div className="flex-1 w-full space-y-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        const formData = new FormData()
                        formData.append("image", file)
                        try {
                          const res = await apiRequest("/settings/catalog/upload-image/", {
                            method: "POST",
                            body: formData,
                          })
                          if (res.success && res.url) {
                            setQuickPriceEditing((prev) => ({ ...prev, image: res.url }))
                            showToast("Image uploaded successfully!")
                          } else {
                            showToast(res.message || "Upload failed", "error")
                          }
                        } catch (err) {
                          showToast("Upload failed", "error")
                        }
                      }
                    }}
                    className="block w-full text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-[10px] file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                  />
                  <Input
                    label="Or Image URL"
                    placeholder="https://images.unsplash.com/..."
                    value={quickPriceEditing.image || ""}
                    onChange={(e) => setQuickPriceEditing({ ...quickPriceEditing, image: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* ── View Details Content Section (only for home/technician services — excluded for fresh vegetables, groceries, and transport) ── */}
            {activeCategoryKey !== "goods_transports" &&
             activeCategoryKey !== "food_health" &&
             activeCategoryKey !== "vegetables" &&
             activeCategoryKey !== "groceries" &&
             quickPriceEditing?.category_slug !== "food_health" &&
             quickPriceEditing?.category_slug !== "goods_transports" &&
             !/vegetable|grocery|food|transport|wheeler|truck|packers/i.test(quickPriceEditing?.service_name || quickPriceEditing?.serviceSlug || quickPriceEditing?.categoryName || "") && (() => {
              const vd = quickPriceEditing.viewDetails || { tools: [], ready: [], reviews: [], faqs: [] }
              const setVd = (updates) => setQuickPriceEditing({ ...quickPriceEditing, viewDetails: { ...vd, ...updates } })
              return (
                <div className="rounded-2xl border border-emerald-100/90 overflow-hidden bg-gradient-to-b from-emerald-50/30 to-slate-50/40">
                  <button
                    type="button"
                    onClick={() => setQuickPriceEditing({ ...quickPriceEditing, _vdOpen: !quickPriceEditing._vdOpen })}
                    className="w-full flex items-center justify-between px-5 py-3.5 cursor-pointer hover:bg-emerald-50/60 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800">View Details Content</span>
                      <span className="px-2 py-0.5 text-[10px] font-extrabold bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200/90">Shown in app popup</span>
                    </div>
                    <span className="text-slate-400 text-sm font-bold">{quickPriceEditing._vdOpen ? "−" : "+"}</span>
                  </button>

                  {quickPriceEditing._vdOpen && (
                    <div className="px-5 pb-5 space-y-5 border-t border-emerald-100">

                      {/* Tools & Products We Use */}
                      <div className="pt-4">
                        <div className="text-xs font-bold text-slate-700 mb-2">🔧 Tools & Products We Use</div>
                        <div className="space-y-1.5 mb-2">
                          {(vd.tools || []).map((t, i) => {
                            const text = typeof t === 'string' ? t : (t.text || '');
                            const enabled = typeof t === 'string' ? true : (t.enabled !== false);
                            return (
                              <div key={i} className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={enabled}
                                  onChange={(e) => {
                                    const a = [...(vd.tools || [])];
                                    const cur = typeof a[i] === 'string' ? { text: a[i], enabled: true } : { ...a[i] };
                                    a[i] = { ...cur, enabled: e.target.checked };
                                    setVd({ tools: a });
                                  }}
                                  className="w-4 h-4 rounded accent-indigo-600 cursor-pointer shrink-0"
                                />
                                <input
                                  type="text"
                                  value={text}
                                  onChange={(e) => {
                                    const a = [...(vd.tools || [])];
                                    const cur = typeof a[i] === 'string' ? { text: a[i], enabled: true } : { ...a[i] };
                                    a[i] = { ...cur, text: e.target.value };
                                    setVd({ tools: a });
                                  }}
                                  className={`flex-1 h-8 px-3 rounded-lg border border-slate-200 bg-white text-xs font-medium focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/20 outline-none ${!enabled ? 'text-slate-400 line-through bg-slate-50' : 'text-slate-800'}`}
                                />
                                <button type="button" onClick={() => { const a = [...(vd.tools || [])]; a.splice(i, 1); setVd({ tools: a }); }} className="p-1 text-slate-400 hover:text-rose-500 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                              </div>
                            );
                          })}
                        </div>
                        <button type="button" onClick={() => setVd({ tools: [...(vd.tools || []), { text: '', enabled: true }] })} className="text-[11px] font-bold text-emerald-600 hover:underline cursor-pointer">+ Add tool / product</button>
                      </div>

                      {/* What You Need to Keep Ready */}
                      <div className="pt-2 border-t border-slate-100">
                        <div className="text-xs font-bold text-slate-700 mb-2">✅ What You Need to Keep Ready</div>
                        <div className="space-y-1.5 mb-2">
                          {(vd.ready || []).map((r, i) => {
                            const text = typeof r === 'string' ? r : (r.text || '');
                            const enabled = typeof r === 'string' ? true : (r.enabled !== false);
                            return (
                              <div key={i} className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={enabled}
                                  onChange={(e) => {
                                    const a = [...(vd.ready || [])];
                                    const cur = typeof a[i] === 'string' ? { text: a[i], enabled: true } : { ...a[i] };
                                    a[i] = { ...cur, enabled: e.target.checked };
                                    setVd({ ready: a });
                                  }}
                                  className="w-4 h-4 rounded accent-indigo-600 cursor-pointer shrink-0"
                                />
                                <input
                                  type="text"
                                  value={text}
                                  onChange={(e) => {
                                    const a = [...(vd.ready || [])];
                                    const cur = typeof a[i] === 'string' ? { text: a[i], enabled: true } : { ...a[i] };
                                    a[i] = { ...cur, text: e.target.value };
                                    setVd({ ready: a });
                                  }}
                                  className={`flex-1 h-8 px-3 rounded-lg border border-slate-200 bg-white text-xs font-medium focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/20 outline-none ${!enabled ? 'text-slate-400 line-through bg-slate-50' : 'text-slate-800'}`}
                                />
                                <button type="button" onClick={() => { const a = [...(vd.ready || [])]; a.splice(i, 1); setVd({ ready: a }); }} className="p-1 text-slate-400 hover:text-rose-500 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                              </div>
                            );
                          })}
                        </div>
                        <button type="button" onClick={() => setVd({ ready: [...(vd.ready || []), { text: '', enabled: true }] })} className="text-[11px] font-bold text-emerald-600 hover:underline cursor-pointer">+ Add item</button>
                      </div>

                      {/* Customer Reviews */}
                      <div className="pt-2 border-t border-slate-100">
                        <div className="text-xs font-bold text-slate-700 mb-2">⭐ Customer Reviews</div>
                        <div className="space-y-2.5 mb-2">
                          {(vd.reviews || []).map((rev, i) => {
                            const enabled = rev.enabled !== false;
                            return (
                              <div key={i} className={`bg-white border rounded-xl p-3 space-y-2 ${!enabled ? 'border-slate-100 opacity-60' : 'border-slate-200'}`}>
                                <div className="flex gap-2 items-center">
                                  <input
                                    type="checkbox"
                                    checked={enabled}
                                    onChange={(e) => { const a = [...(vd.reviews || [])]; a[i] = { ...a[i], enabled: e.target.checked }; setVd({ reviews: a }); }}
                                    className="w-4 h-4 rounded accent-indigo-600 cursor-pointer shrink-0"
                                  />
                                  <input type="text" placeholder="Name" value={rev.name || ""} onChange={(e) => { const a = [...(vd.reviews || [])]; a[i] = { ...a[i], name: e.target.value }; setVd({ reviews: a }); }} className="flex-1 h-8 px-2 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium text-slate-800 focus:border-indigo-400 outline-none" />
                                  <input type="text" placeholder="Rating (e.g. 4.9)" value={rev.rating || ""} onChange={(e) => { const a = [...(vd.reviews || [])]; a[i] = { ...a[i], rating: e.target.value }; setVd({ reviews: a }); }} className="w-24 h-8 px-2 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium text-slate-800 focus:border-indigo-400 outline-none" />
                                  <button type="button" onClick={() => { const a = [...(vd.reviews || [])]; a.splice(i, 1); setVd({ reviews: a }); }} className="p-1 text-slate-400 hover:text-rose-500 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                                </div>
                                <textarea placeholder="Review text..." value={rev.text || ""} onChange={(e) => { const a = [...(vd.reviews || [])]; a[i] = { ...a[i], text: e.target.value }; setVd({ reviews: a }); }} rows={2} className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium text-slate-700 focus:border-indigo-400 outline-none resize-none" />
                              </div>
                            );
                          })}
                        </div>
                        <button type="button" onClick={() => setVd({ reviews: [...(vd.reviews || []), { name: "", rating: "5.0", text: "", enabled: true }] })} className="text-[11px] font-bold text-emerald-600 hover:underline cursor-pointer">+ Add review</button>
                      </div>

                      {/* FAQs */}
                      <div className="pt-2 border-t border-slate-100">
                        <div className="text-xs font-bold text-slate-700 mb-2">❓ Frequently Asked Questions</div>
                        <div className="space-y-2.5 mb-2">
                          {(vd.faqs || []).map((faq, i) => {
                            const enabled = faq.enabled !== false;
                            return (
                              <div key={i} className={`bg-white border rounded-xl p-3 space-y-2 ${!enabled ? 'border-slate-100 opacity-60' : 'border-slate-200'}`}>
                                <div className="flex gap-2 items-center">
                                  <input
                                    type="checkbox"
                                    checked={enabled}
                                    onChange={(e) => { const a = [...(vd.faqs || [])]; a[i] = { ...a[i], enabled: e.target.checked }; setVd({ faqs: a }); }}
                                    className="w-4 h-4 rounded accent-indigo-600 cursor-pointer shrink-0"
                                  />
                                  <input type="text" placeholder="Question" value={faq.q || ""} onChange={(e) => { const a = [...(vd.faqs || [])]; a[i] = { ...a[i], q: e.target.value }; setVd({ faqs: a }); }} className="flex-1 h-8 px-2 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium text-slate-800 focus:border-indigo-400 outline-none" />
                                  <button type="button" onClick={() => { const a = [...(vd.faqs || [])]; a.splice(i, 1); setVd({ faqs: a }); }} className="p-1 text-slate-400 hover:text-rose-500 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                                </div>
                                <textarea placeholder="Answer..." value={faq.a || ""} onChange={(e) => { const a = [...(vd.faqs || [])]; a[i] = { ...a[i], a: e.target.value }; setVd({ faqs: a }); }} rows={2} className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium text-slate-700 focus:border-indigo-400 outline-none resize-none" />
                              </div>
                            );
                          })}
                        </div>
                        <button type="button" onClick={() => setVd({ faqs: [...(vd.faqs || []), { q: "", a: "", enabled: true }] })} className="text-[11px] font-bold text-emerald-600 hover:underline cursor-pointer">+ Add FAQ</button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}


            <div className="flex gap-3 justify-end mt-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setQuickPriceEditing(null)}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-sm font-extrabold shadow-lg shadow-indigo-600/25 transition-all cursor-pointer flex items-center gap-2"
              >
                <span>Save &amp; Publish Live</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Full Edit / New Package Modal ── */}
      {editing && (
        <Modal
          maxWidth="max-w-2xl sm:max-w-3xl"
          title={editing.id ? `Edit Package: ${editing.name}` : "Create New Package"}
          onClose={() => setEditing(null)}
        >
          <form onSubmit={handleSave} className="flex flex-col gap-5 font-sans text-left">
            <Select
              label="Parent Service"
              required
              options={services.map((s) => ({
                value: String(s.id),
                label: `${s.category_name ? s.category_name + " / " : ""}${s.name}`,
              }))}
              value={String(editing.service?.id || editing.service || "")}
              onChange={(e) => {
                const sId = e.target.value
                const matchSvc = services.find(s => String(s.id) === sId)
                setEditing({ ...editing, service: sId, virtualSlug: matchSvc?.virtualSlug || "" })
              }}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Package Name"
                required
                placeholder={namePlaceholder}
                value={editing.name}
                onChange={(e) => {
                  const val = e.target.value
                  const autoSlug = !editing.id
                    ? val.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
                    : editing.slug
                  setEditing({ ...editing, name: val, slug: autoSlug })
                }}
              />
              <Input
                label="Slug Identifier"
                required
                placeholder={slugPlaceholder}
                value={editing.slug}
                onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
              />
            </div>

            <TextArea
              label="Short Description"
              placeholder={descPlaceholder}
              value={editing.description || ""}
              onChange={(e) => setEditing({ ...editing, description: e.target.value })}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Price / Starting Fare (₹)"
                type="number"
                required
                placeholder="e.g. 300"
                value={editing.base_price}
                onChange={(e) => setEditing({ ...editing, base_price: e.target.value })}
              />
              <Input
                label={activeCategoryKey === "goods_transports" ? "Duration of Badge Display (e.g. 30 days, 6 months, 1 yr)" : "Duration / ETA (e.g. 20 mins, 1 hr)"}
                placeholder={activeCategoryKey === "goods_transports" ? "e.g. 30 days, 6 months, 1 yr" : "e.g. 20 mins, 1 hr"}
                value={editing.duration || ""}
                onChange={(e) => setEditing({ ...editing, duration: e.target.value })}
              />
            </div>

            <Input
              label="Tag Badge (e.g. Heavy (above 750kg), Best Seller)"
              value={editing.tag || ""}
              onChange={(e) => setEditing({ ...editing, tag: e.target.value })}
            />

            <Input
              label="Includes (comma-separated features)"
              placeholder={includesPlaceholder}
              value={editing.includes}
              onChange={(e) => setEditing({ ...editing, includes: e.target.value })}
            />

            <Input
              label="Excludes (comma-separated)"
              placeholder={excludesPlaceholder}
              value={editing.excludes}
              onChange={(e) => setEditing({ ...editing, excludes: e.target.value })}
            />

            {/* ── Image Customization Section ── */}
            <div className="bg-slate-50/80 rounded-2xl p-4 sm:p-5 border border-slate-200/90 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-bold text-slate-800">
                    Package Image
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Upload a custom package image or paste an image URL. Fits automatically to size and ratio.
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                {editing.image ? (
                  <div className="relative w-20 h-20 rounded-xl border border-slate-200 overflow-hidden bg-slate-100 flex-shrink-0 group">
                    <img src={editing.image} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setEditing((prev) => ({ ...prev, image: "" }))}
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-bold transition-opacity"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-xl border border-dashed border-slate-300 flex items-center justify-center bg-slate-50 flex-shrink-0 text-slate-400 text-[10px] font-bold">
                    No Image
                  </div>
                )}
                <div className="flex-1 w-full space-y-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        const formData = new FormData()
                        formData.append("image", file)
                        try {
                          const res = await apiRequest("/settings/catalog/upload-image/", {
                            method: "POST",
                            body: formData,
                          })
                          if (res.success && res.url) {
                            setEditing((prev) => ({ ...prev, image: res.url }))
                            showToast("Image uploaded successfully!")
                          } else {
                            showToast(res.message || "Upload failed", "error")
                          }
                        } catch (err) {
                          showToast("Upload failed", "error")
                        }
                      }
                    }}
                    className="block w-full text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-[10px] file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                  />
                  <Input
                    label="Or Image URL"
                    placeholder="https://images.unsplash.com/..."
                    value={editing.image || ""}
                    onChange={(e) => setEditing({ ...editing, image: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!editing.popular}
                  onChange={(e) => setEditing({ ...editing, popular: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                />
                <span>Featured / Popular in Customer Booking</span>
              </label>
            </div>

            <div className="flex gap-3 justify-end mt-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-extrabold shadow-md shadow-indigo-700/20 transition-all cursor-pointer flex items-center gap-2"
              >
                <span>{editing.id ? "Save Changes" : "Create Package"}</span>
                <Check className="w-4 h-4" />
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
