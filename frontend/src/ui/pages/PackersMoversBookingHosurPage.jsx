import React, { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import {
  MapPin, ChevronDown, ChevronUp, ArrowRight, ShieldCheck,
  Clock, Package, Boxes, X, Sparkles, Navigation, Truck,
  CheckCircle2, Star, Phone, HelpCircle, Loader2, LocateFixed,
  User, Mail, MessageSquare, AlertCircle, Home, Bike, Check,
  ClipboardList, Settings, Zap, Wrench, Search, Plus, Calendar
} from "lucide-react"
import { routes } from "../routes.js"
import { fetchServiceTiers, fetchLanes, fetchServiceAreas } from "../../api/logisticsService.js"
import { createBooking } from "../../api/bookingService.js"
import { apiRequestCustomerPhoneOTP, apiVerifyCustomerPhoneOTP } from "../../api/authService.js"
import { todayDateString } from "../../components/logistics/LogisticsKit.jsx"

const LOGISTICS_CITY = "hosur"

/* ── Vector Diagrams for Packers & Movers Packages (NoBroker Style) ── */
function OneBhkDiagram({ className = "w-full h-[120px]" }) {
  return (
    <svg viewBox="0 0 200 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Baseline */}
      <line x1="20" y1="100" x2="180" y2="100" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" />
      
      {/* Bed (Blue) */}
      <path d="M30 96H75V76H35C32.2386 76 30 78.2386 30 81V96Z" fill="#2563EB" />
      <rect x="25" y="60" width="5" height="36" fill="#1E3A8A" />
      {/* Pillow */}
      <rect x="35" y="70" width="16" height="6" rx="3" fill="#FFFFFF" />
      {/* Lamp next to bed */}
      <path d="M78 96L78 60" stroke="#94A3B8" strokeWidth="2" />
      <path d="M72 60L84 60L80 50L76 50Z" fill="#10B981" />

      {/* Tall Wardrobe (Brown) */}
      <rect x="90" y="35" width="30" height="61" fill="#D97706" />
      <line x1="105" y1="35" x2="105" y2="96" stroke="#B45309" strokeWidth="1.5" />
      <circle cx="102" cy="70" r="1.5" fill="#FEF3C7" />
      <circle cx="108" cy="70" r="1.5" fill="#FEF3C7" />

      {/* Cartons */}
      <rect x="125" y="70" width="22" height="26" fill="#F59E0B" />
      <rect x="125" y="78" width="22" height="2" fill="#D97706" />
      <rect x="150" y="80" width="16" height="16" fill="#FBBF24" />
      <rect x="150" y="85" width="16" height="2" fill="#F59E0B" />
    </svg>
  )
}

function TwoBhkDiagram({ className = "w-full h-[120px]" }) {
  return (
    <svg viewBox="0 0 200 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Baseline */}
      <line x1="20" y1="100" x2="180" y2="100" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" />
      
      {/* Sofa (Green) */}
      <rect x="40" y="75" width="40" height="21" rx="2" fill="#059669" />
      <rect x="35" y="65" width="8" height="31" rx="2" fill="#047857" />
      <rect x="77" y="65" width="8" height="31" rx="2" fill="#047857" />
      <rect x="42" y="55" width="36" height="20" rx="3" fill="#10B981" />

      {/* Fridge (Grey) */}
      <rect x="95" y="30" width="26" height="66" rx="2" fill="#94A3B8" />
      <line x1="95" y1="55" x2="121" y2="55" stroke="#64748B" strokeWidth="2" />
      <rect x="98" y="40" width="3" height="8" rx="1.5" fill="#475569" />
      <rect x="98" y="60" width="3" height="12" rx="1.5" fill="#475569" />

      {/* Washing Machine (Light Grey) */}
      <rect x="126" y="60" width="28" height="36" rx="2" fill="#E2E8F0" />
      <circle cx="140" cy="78" r="10" fill="#94A3B8" />
      <circle cx="140" cy="78" r="6" fill="#60A5FA" />
      
      {/* Boxes */}
      <rect x="160" y="60" width="20" height="24" fill="#F59E0B" />
      <rect x="160" y="68" width="20" height="2" fill="#D97706" />
      
      <rect x="164" y="44" width="12" height="16" fill="#FBBF24" />
      <rect x="157" y="84" width="28" height="12" fill="#D97706" />
    </svg>
  )
}

function ThreeBhkVillaDiagram({ className = "w-full h-[120px]" }) {
  return (
    <svg viewBox="0 0 200 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Baseline */}
      <line x1="20" y1="100" x2="180" y2="100" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" />
      
      {/* Truck */}
      <rect x="25" y="50" width="45" height="40" fill="#1E293B" />
      <path d="M70 60H85C88 60 90 62 90 65L93 75C94 77 94 80 94 82V90H70V60Z" fill="#3B82F6" />
      <circle cx="45" cy="94" r="6" fill="#0F172A" />
      <circle cx="45" cy="94" r="3" fill="#E2E8F0" />
      <circle cx="82" cy="94" r="6" fill="#0F172A" />
      <circle cx="82" cy="94" r="3" fill="#E2E8F0" />

      {/* Tall Boxes (Orange/Green) */}
      <rect x="100" y="40" width="22" height="56" fill="#D97706" />
      <rect x="100" y="52" width="22" height="2" fill="#B45309" />
      
      <rect x="125" y="55" width="20" height="41" fill="#059669" />
      
      <rect x="148" y="65" width="16" height="31" fill="#F59E0B" />
      <rect x="148" y="75" width="16" height="2" fill="#D97706" />
      
      <rect x="148" y="45" width="16" height="20" fill="#FBBF24" />
      <rect x="148" y="55" width="16" height="2" fill="#F59E0B" />
    </svg>
  )
}

/* ── Custom Vector Graphics for Cross Linking ── */
function TwoWheelerGraphic({ className = "w-28 h-20" }) {
  return (
    <svg viewBox="0 0 110 80" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="55" cy="68" rx="42" ry="4" fill="#cbd5e1" opacity="0.6" />
      <circle cx="28" cy="56" r="13" fill="#1e293b" />
      <circle cx="28" cy="56" r="7" fill="#e2e8f0" stroke="#64748b" strokeWidth="1.5" />
      <circle cx="82" cy="56" r="13" fill="#1e293b" />
      <circle cx="82" cy="56" r="7" fill="#e2e8f0" stroke="#64748b" strokeWidth="1.5" />
      <path d="M28 56L44 40H66L82 56" stroke="#059669" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M40 38C40 34 46 32 54 32C62 32 68 35 68 38L40 38Z" fill="#1e293b" />
      <line x1="72" y1="28" x2="82" y2="56" stroke="#475569" strokeWidth="3" strokeLinecap="round" />
      <path d="M68 24C72 22 76 24 80 24" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" />
      <circle cx="84" cy="30" r="4.5" fill="#38bdf8" stroke="#0284c7" strokeWidth="1.2" />
      <circle cx="84" cy="30" r="2.5" fill="#fef08a" />
      <rect x="22" y="24" width="22" height="18" rx="2" fill="#334155" stroke="#1e293b" strokeWidth="1.5" />
      <rect x="20" y="22" width="26" height="4" rx="1" fill="#475569" />
    </svg>
  )
}

function TruckGraphic({ className = "w-28 h-20" }) {
  return (
    <svg viewBox="0 0 120 90" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="58" cy="74" rx="44" ry="4.5" fill="#d1fae5" opacity="0.8" />
      <rect x="18" y="24" width="48" height="38" rx="4" fill="#f59e0b" />
      <path d="M18 28C18 25.8 19.8 24 22 24H62C64.2 24 66 25.8 66 28V32H18V28Z" fill="#fbbf24" />
      <line x1="34" y1="26" x2="34" y2="60" stroke="#d97706" strokeWidth="1.5" strokeDasharray="3 3" />
      <line x1="50" y1="26" x2="50" y2="60" stroke="#d97706" strokeWidth="1.5" strokeDasharray="3 3" />
      <path d="M64 34H78C82 34 85 36.5 86.5 40.5L91 50C92 52.5 92 55 92 57.5V62H64V34Z" fill="#2563eb" />
      <path d="M69 38H77C79 38 80.8 39.5 81.6 41.5L84.5 48.5H69V38Z" fill="#93c5fd" />
      <circle cx="89" cy="56" r="2.5" fill="#fef08a" />
      <circle cx="32" cy="64" r="9.5" fill="#1e293b" />
      <circle cx="32" cy="64" r="5" fill="#94a3b8" />
      <circle cx="76" cy="64" r="9.5" fill="#1e293b" />
      <circle cx="76" cy="64" r="5" fill="#94a3b8" />
    </svg>
  )
}

function WeightIcon({ className = "w-3.5 h-3.5" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12 3a3 3 0 00-3 3v1H6a2 2 0 00-2 2l2 11a2 2 0 002 2h8a2 2 0 002-2l2-11a2 2 0 00-2-2h-3V6a3 3 0 00-3-3zm-1 4V6a1 1 0 112 0v1h-2z" />
    </svg>
  )
}

function QRCodeGraphic({ className = "w-36 h-36" }) {
  return (
    <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="120" rx="12" fill="white" stroke="#e2e8f0" strokeWidth="1.5" />
      <rect x="14" y="14" width="28" height="28" rx="4" fill="#0f172a" />
      <rect x="18" y="18" width="20" height="20" rx="2" fill="white" />
      <rect x="23" y="23" width="10" height="10" rx="1" fill="#0f172a" />
      <rect x="78" y="14" width="28" height="28" rx="4" fill="#0f172a" />
      <rect x="82" y="18" width="20" height="20" rx="2" fill="white" />
      <rect x="87" y="23" width="10" height="10" rx="1" fill="#0f172a" />
      <rect x="14" y="78" width="28" height="28" rx="4" fill="#0f172a" />
      <rect x="18" y="82" width="20" height="20" rx="2" fill="white" />
      <rect x="23" y="87" width="10" height="10" rx="1" fill="#0f172a" />
      <rect x="48" y="16" width="6" height="6" fill="#0f172a" />
      <rect x="58" y="16" width="6" height="12" fill="#0f172a" />
      <rect x="48" y="28" width="16" height="6" fill="#0f172a" />
      <rect x="16" y="48" width="12" height="6" fill="#0f172a" />
      <rect x="34" y="48" width="6" height="16" fill="#0f172a" />
      <rect x="46" y="46" width="28" height="28" rx="4" fill="#059669" />
      <rect x="52" y="52" width="16" height="16" rx="2" fill="white" />
      <path d="M56 60L60 64L66 56" stroke="#059669" strokeWidth="2" strokeLinecap="round" />
      <rect x="80" y="48" width="8" height="8" fill="#0f172a" />
      <rect x="94" y="48" width="10" height="6" fill="#0f172a" />
      <rect x="80" y="62" width="6" height="14" fill="#0f172a" />
      <rect x="92" y="60" width="12" height="8" fill="#0f172a" />
      <rect x="48" y="80" width="14" height="6" fill="#0f172a" />
      <rect x="68" y="80" width="6" height="16" fill="#0f172a" />
      <rect x="80" y="80" width="16" height="6" fill="#0f172a" />
    </svg>
  )
}

/* ── Hosur Location Database ── */
/* ── Maps backend ServiceTier.slug → the illustration for that package.
   Diagrams stay local (purely cosmetic); everything else (name, capacity,
   price, description) now comes from GET /api/logistics/tiers/. ── */
const PACKERS_DIAGRAM_BY_SLUG = {
  "1rk-1bhk-shifting": <OneBhkDiagram />,
  "2bhk-3bhk-shifting": <TwoBhkDiagram />,
  "villa-office-relocation": <ThreeBhkVillaDiagram />,
}

const LOCATIONS_DATABASE = {
  "HOSUR": [
    { name: "Hosur Bus Stand", subtitle: "Central Hosur, Tamil Nadu", category: "Hosur Central" },
    { name: "SIPCOT Phase 1", subtitle: "Industrial Area, Hosur", category: "SIPCOT Industrial" },
    { name: "SIPCOT Phase 2", subtitle: "Industrial Complex, Hosur", category: "SIPCOT Industrial" },
    { name: "Mathigiri", subtitle: "Hosur, Tamil Nadu", category: "Hosur Area" },
    { name: "Bagalur Road", subtitle: "Hosur, Tamil Nadu", category: "Hosur Area" },
    { name: "Avalapalli Road", subtitle: "Hosur, Tamil Nadu", category: "Hosur Area" },
    { name: "Zuzuvadi", subtitle: "Hosur Border, Tamil Nadu", category: "Hosur Area" },
    { name: "Mookandapalli", subtitle: "Industrial Belt, Hosur", category: "Hosur Area" },
    { name: "Moranapalli", subtitle: "Industrial Hub, Hosur", category: "Hosur Area" },
    { name: "Denkanikottai Road", subtitle: "Hosur, Tamil Nadu", category: "Hosur Area" },
    { name: "Rayakottai Road", subtitle: "Hosur, Tamil Nadu", category: "Hosur Area" },
    { name: "Thally Road", subtitle: "Hosur, Tamil Nadu", category: "Hosur Area" },
    { name: "Attibele Border & Toll Plaza", subtitle: "Bengaluru Border (~8 Kms)", category: "Near Hosur" },
    { name: "Electronic City Phase 1", subtitle: "Bengaluru (~28 Kms)", category: "Bengaluru Hub" },
    { name: "Electronic City Phase 2", subtitle: "Bengaluru (~26 Kms)", category: "Bengaluru Hub" },
    { name: "Whitefield", subtitle: "Bengaluru (~42 Kms)", category: "Bengaluru Hub" },
    { name: "Bengaluru Central (Majestic)", subtitle: "Karnataka (40 Kms)", category: "Intercity Route" },
    { name: "Krishnagiri Town", subtitle: "Tamil Nadu (55 Kms)", category: "Intercity Route" },
    { name: "Chennai (Koyambedu / Port)", subtitle: "Tamil Nadu (310 Kms)", category: "Intercity Route" },
    { name: "Coimbatore (Gandhipuram)", subtitle: "Tamil Nadu (310 Kms)", category: "Intercity Route" }
  ],
  "BENGALURU": [
    { name: "Koramangala", subtitle: "Bengaluru, Karnataka", category: "Bengaluru Central" },
    { name: "Indiranagar", subtitle: "Bengaluru, Karnataka", category: "Bengaluru Central" },
    { name: "Whitefield", subtitle: "Bengaluru, Karnataka", category: "Bengaluru IT Hub" },
    { name: "Electronic City", subtitle: "Bengaluru, Karnataka", category: "Bengaluru IT Hub" },
    { name: "HSR Layout", subtitle: "Bengaluru, Karnataka", category: "Bengaluru Central" },
    { name: "Marathahalli", subtitle: "Bengaluru, Karnataka", category: "Bengaluru IT Hub" },
    { name: "Jayanagar", subtitle: "Bengaluru, Karnataka", category: "Bengaluru South" },
    { name: "JP Nagar", subtitle: "Bengaluru, Karnataka", category: "Bengaluru South" },
    { name: "Bellandur", subtitle: "Bengaluru, Karnataka", category: "Bengaluru IT Hub" },
    { name: "BTM Layout", subtitle: "Bengaluru, Karnataka", category: "Bengaluru South" },
    { name: "Majestic", subtitle: "Bengaluru, Karnataka", category: "Bengaluru Central" },
    { name: "Hosur (SIPCOT)", subtitle: "Tamil Nadu (~40 Kms)", category: "Intercity Route" }
  ],
  "CHENNAI": [
    { name: "Anna Nagar", subtitle: "Chennai, Tamil Nadu", category: "Chennai Central" },
    { name: "T Nagar", subtitle: "Chennai, Tamil Nadu", category: "Chennai Central" },
    { name: "Velachery", subtitle: "Chennai, Tamil Nadu", category: "Chennai South" },
    { name: "Adyar", subtitle: "Chennai, Tamil Nadu", category: "Chennai South" },
    { name: "Tambaram", subtitle: "Chennai, Tamil Nadu", category: "Chennai South" },
    { name: "OMR (Old Mahabalipuram Road)", subtitle: "Chennai, Tamil Nadu", category: "Chennai IT Corridor" },
    { name: "Guindy", subtitle: "Chennai, Tamil Nadu", category: "Chennai Central" },
    { name: "Porur", subtitle: "Chennai, Tamil Nadu", category: "Chennai West" },
    { name: "Thiruvanmiyur", subtitle: "Chennai, Tamil Nadu", category: "Chennai South" },
    { name: "Chromepet", subtitle: "Chennai, Tamil Nadu", category: "Chennai South" },
    { name: "Koyambedu", subtitle: "Chennai, Tamil Nadu", category: "Chennai Central" }
  ]
}

function filterLocationSuggestions(searchText, city = "HOSUR") {
  const cityLocations = LOCATIONS_DATABASE[city] || LOCATIONS_DATABASE["HOSUR"]
  
  if (!searchText || !searchText.trim()) {
    return cityLocations.slice(0, 8)
  }

  const query = searchText.trim().toLowerCase()
  const exactStarts = []
  const wordStarts = []
  const containsMatches = []

  cityLocations.forEach((item) => {
    const nameLow = item.name.toLowerCase()
    const subLow = item.subtitle.toLowerCase()

    if (nameLow.startsWith(query)) {
      exactStarts.push(item)
    } else if (
      nameLow.split(/[\s,/-]+/).some((w) => w.startsWith(query)) ||
      subLow.split(/[\s,/-]+/).some((w) => w.startsWith(query))
    ) {
      wordStarts.push(item)
    } else if (nameLow.includes(query) || subLow.includes(query)) {
      containsMatches.push(item)
    }
  })

  const combined = [...exactStarts, ...wordStarts, ...containsMatches]
  const seen = new Set()
  const result = []
  for (const it of combined) {
    if (!seen.has(it.name)) {
      seen.add(it.name)
      result.push(it)
    }
    if (result.length >= 9) break
  }
  return result
}

/* ── Comprehensive Inventory Data ── */
const INVENTORY_DATA = {
  "Bedrooms": {
    "Bed": [
      "Baby Wooden Bed", "Bunk Bed - Dismantlable", "Cradle - Dismantleable", 
      "Diwan Cum Bed", "Double Bed - Dismantlable", "King Size Bed - With Storage", 
      "King Size Bed - Without Storage", "Queen Size Bed - With Storage", 
      "Queen Size Bed - Without Storage", "Single Bed - Foldable", 
      "Single Bed - With Storage", "Single Bed - Without Storage", 
      "Single Bed Non Storage - Dismantlable", "Single Bed Storage - Dismantlable"
    ],
    "Mattress": [
      "Double Bed Mattress - Foldable", "Double Bed Mattress - Non Foldable", 
      "Single Bed Mattress - Foldable", "Single Bed Mattress - Non Foldable"
    ],
    "Table": [
      "Bed Side Table", "Center Table", "Study /Computer Table"
    ],
    "Chair": [
      "Arm Chair", "Bean Bag/Pouffe", "Office Chair"
    ],
    "Television": [
      "LCD/LED 52\" - 65\"", "LCD/LED 65\" & Above", "LCD/LED TV 40\" & Below", 
      "LCD/LED TV 42\" - 50\"", "LCD/LED TV 52\" & Above", "Regular TV (Old Model)"
    ],
    "Air Conditioner": [
      "Split Air Conditioner (AC)", "Window Air Conditioner (AC)"
    ],
    "Almirah/Wardrobe": [
      "Double Door Wardrobe", "Five Door Wardrobe", "Four Door Wardrobe", 
      "Single Door Wardrobe", "Sliding Door Wardrobe", "Steel Almirah Large", 
      "Steel Almirah Medium", "Triple Door Wardrobe"
    ],
    "Cabinet & Storage": [
      "Book Shelf Large", "Book Shelf Medium", "Book Shelf Small", 
      "Chest of Drawers Large", "Chest of Drawers Medium", "Chest of Drawers Small", 
      "Display Cabinet Large", "Display Cabinet Small", "Dressing Table", 
      "Entertainment/TV Unit", "Iron Locker Small", "Plastic Cupboard", 
      "Safe Small", "Trunk", "TV Table", "Wall Shelf"
    ],
    "Appliances": [
      "Air Cooler", "Air Purifier", "Ceiling/Table Fan", "Garment Steamer", "Instant Geyser"
    ]
  },
  "Living Room": {
    "Sofa": [
      "1 Seater Sofa", "1 Seater Sofa - Leather", "2 Seater Sofa", "2 Seater Sofa - Leather", 
      "3 Seater Sofa", "3 Seater Sofa - L Shape", "3 Seater Sofa - Leather", "4 Seater Sofa", 
      "5 Seater Sofa - L Shape", "7 Seater Sofa - L Shape", "Recliner Sofa 1-Seater", 
      "Recliner Sofa 2-Seater", "Recliner Sofa 3-Seater", "Sofa Cum Bed"
    ],
    "Dining": [
      "Dining Chair", "Dining Table Only - 4 Seater", "Dining Table Only - 6 Seater", 
      "Dining Table Only - 8 Seater", "Glass Top Dining Table Only - 4 Seater", 
      "Glass Top Dining Table Only - 6 Seater", "Glass Top Dining Table Only - 8 Seater", 
      "Marble Top Dining Table Only - 4 Seater", "Marble Top Dining Table Only - 6 Seater", 
      "Marble Top Dining Table Only - 8 Seater"
    ],
    "Television": [
      "LCD/LED 52\" - 65\"", "LCD/LED 65\" & Above", "LCD/LED TV 40\" & Below", 
      "LCD/LED TV 42\" - 50\"", "LCD/LED TV 52\" & Above", "Regular TV (Old Model)"
    ],
    "Table": [
      "Coffee Table Large", "Coffee Table Small", "Console Table", "Folding Table"
    ],
    "Chair": [
      "Arm Chair", "Bean Bag/Pouffe", "Bench", "Folding Chair", "High Chair", 
      "Plastic Chair", "Rocking Chair", "Settee", "Stool", "Study Chair", "Wooden Chair"
    ],
    "Air Conditioner": [
      "Split Air Conditioner (AC)", "Window Air Conditioner (AC)"
    ],
    "Cabinet & Storage": [
      "Book Shelf Large", "Book Shelf Medium", "Book Shelf Small", "Chest of Drawers Large", 
      "Chest of Drawers Medium", "Chest of Drawers Small", "Display Cabinet Large", 
      "Display Cabinet Small", "Entertainment/TV Unit", "Plastic Cupboard", "Prayer Unit/Mandir", 
      "Shoe Rack Metal", "Shoe Rack Wooden", "TV Table", "Wall Shelf"
    ],
    "Appliances": [
      "Air Cooler", "Air Purifier", "Ceiling/Table Fan", "Music/Video System"
    ],
    "Bar Furniture": []
  },
  "Kitchen": {
    "Refrigerator": [
      "Double Door Refrigerator", "Single Door Refrigerator"
    ],
    "Kitchen Items": [
      "Gas Stove / Hob", "Kitchen Metal Rack", "LPG Gas Cylinder", "Water Drum"
    ],
    "Appliances": [
      "Air Fryer", "Barbeque Grill Large", "Barbeque Grill Small", "Cooking Range", 
      "Dish washer", "Domestic Flour Mill/ Atta Chakki", "Electric Tandoor", "Food Processor", 
      "Holds 2-3 Pressure Cookers (5 Litre) Or Equivalent", "Hood Chimney", "Microwave Oven & OTG", 
      "Mixer Grinder", "Water Purifier", "Wet grinder"
    ],
    "Furniture": [
      "Kitchen Rack", "Serving Trolley", "Side Table"
    ]
  },
  "Miscellaneous": {
    "Washing Machine": [
      "Washing Machine <6.9kg", "Washing Machine 7-7.9kg", "Washing Machine 8kg+"
    ],
    "Musical Instruments": [
      "Drum Set - 5 piece", "Electronic Keyboard", "Grand Piano", "Guitar", 
      "Harmonium", "Piano", "Synthesizer", "Tabla"
    ],
    "Decorative Items": [],
    "Suitcases and Trolleys": [],
    "Bicycle": [],
    "Home Utility": [],
    "Kids Vehicle": [],
    "Gym Equipments": [],
    "Swing": [],
    "Home Appliances": [],
    "Plants and Pots": []
  },
  "Cartons": {
    "Self Carton": [
      "Large", "Medium", "Small"
    ],
    "NoBroker Carton": [
      "Gunny Bag", "(1.5ft x 1.5ft x 2ft)"
    ]
  }
}

/* ── Slots & Dates Helper ── */
const generateUpcomingDates = () => {
  const dates = []
  const today = new Date()
  for (let i = 1; i <= 7; i++) {
    const nextDate = new Date(today)
    nextDate.setDate(today.getDate() + i)
    
    let dayName = ""
    if (i === 1) dayName = "Tomorrow"
    else dayName = nextDate.toLocaleDateString("en-US", { weekday: "short" })
    
    const dateNum = nextDate.getDate().toString().padStart(2, "0")
    const monthStr = nextDate.toLocaleDateString("en-US", { month: "short" })
    
    dates.push({
      id: `date_${i}`,
      label: dayName,
      value: `${dateNum} ${monthStr}`,
      fullDate: nextDate
    })
  }
  return dates
}

const SHIFTING_DATES = generateUpcomingDates()

const SHIFTING_SLOTS = {
  "Morning": ["6AM-7AM", "7AM-8AM", "8AM-9AM", "9AM-10AM", "10AM-11AM", "11AM-12PM"],
  "Afternoon": ["12PM-1PM", "1PM-2PM", "2PM-3PM", "3PM-4PM", "4PM-5PM"],
  "Evening": ["5PM-6PM", "6PM-7PM", "7PM-8PM", "8PM-9PM", "9PM-10PM"]
}

/* ── Packers & Movers Booking Hosur Page (Image 2 Uniform UI) ── */
export function PackersMoversBookingHosurPage() {
  const navigate = useNavigate()

  // Form State
  const [pickup, setPickup] = useState("")
  const [drop, setDrop] = useState("")
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [userType, setUserType] = useState("1 BHK House Shifting")
  const [selectedRoute, setSelectedRoute] = useState(null)

  // Relocation Type
  const [relocationType, setRelocationType] = useState("Within City")
  const [shiftingDateBetween, setShiftingDateBetween] = useState("")
  const [flexibleDateBetween, setFlexibleDateBetween] = useState(false)

  const [inventoryBuilderOpen, setInventoryBuilderOpen] = useState(false)
  const [stepperStep, setStepperStep] = useState(2) // 1: Location, 2: Add Items, 3: Slots, 4: Summary
  const [activeCategory, setActiveCategory] = useState("Bedrooms")
  
  // Track counts as a flat dictionary: { "Baby Wooden Bed": 1, "1 Seater Sofa": 2 }
  const [inventoryItems, setInventoryItems] = useState({})
  
  // Track expanded category and subcategory accordions in the UI
  const [expandedSubcategories, setExpandedSubcategories] = useState({})
  const [inventorySearchQuery, setInventorySearchQuery] = useState("")

  // Step 3: Date & Slot State
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [expandedSlotCategory, setExpandedSlotCategory] = useState("Morning")

  // Booking Flow State
  const [vehicleSelectorOpen, setVehicleSelectorOpen] = useState(false)
  const [selectedPackage, setSelectedPackage] = useState(null)
  const [loginModalOpen, setLoginModalOpen] = useState(false)
  const [bookingSuccessOpen, setBookingSuccessOpen] = useState(false)
  const [noServiceRoute, setNoServiceRoute] = useState(false)
  const [otpStep, setOtpStep] = useState(false)
  const [otpValue, setOtpValue] = useState("")
  const [loginEmail, setLoginEmail] = useState("")
  const [loginWhatsapp, setLoginWhatsapp] = useState(true)
  const [isSignedIn, setIsSignedIn] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [otpLoading, setOtpLoading] = useState(false)

  // Suggestions Dropdown State
  const [showPickupSuggestions, setShowPickupSuggestions] = useState(false)
  const [showDropSuggestions, setShowDropSuggestions] = useState(false)
  const [showCityDropdown, setShowCityDropdown] = useState(false)
  const [selectedCity, setSelectedCity] = useState("HOSUR")
  const pickupWrapperRef = useRef(null)
  const dropWrapperRef = useRef(null)
  const cityDropdownWrapperRef = useRef(null)

  // Live Location Detection State
  const [isDetectingLocation, setIsDetectingLocation] = useState(false)
  const [locationStatus, setLocationStatus] = useState("")

  // Details Modal
  const [activePackageDetails, setActivePackageDetails] = useState(null)

  // FAQ state
  const [openFaq, setOpenFaq] = useState(null)

  // Catalog data — fetched from /api/logistics/ (backend/logistics app),
  // replacing what used to be hardcoded PACKERS_PACKAGES/POPULAR_ROUTES/
  // HOSUR_AREAS arrays.
  const [fetchedTiers, setFetchedTiers] = useState([])
  const [fetchedLanes, setFetchedLanes] = useState([])
  const [serviceAreas, setServiceAreas] = useState([])
  const [bookingError, setBookingError] = useState("")
  const [bookingSubmitting, setBookingSubmitting] = useState(false)
  const [lastBookingId, setLastBookingId] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function loadCatalog() {
      try {
        const [tiers, lanes, areas] = await Promise.all([
          fetchServiceTiers("packers_movers", LOGISTICS_CITY),
          fetchLanes("packers_movers", LOGISTICS_CITY),
          fetchServiceAreas(LOGISTICS_CITY),
        ])
        if (cancelled) return
        setFetchedTiers(tiers)
        setFetchedLanes(lanes)
        setServiceAreas(areas)
      } catch (err) {
        console.warn("Failed to load logistics catalog, falling back to static data:", err)
      }
    }
    loadCatalog()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (inventoryBuilderOpen || vehicleSelectorOpen || loginModalOpen || bookingSuccessOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }
    return () => {
      document.body.style.overflow = "unset"
    }
  }, [inventoryBuilderOpen, vehicleSelectorOpen, loginModalOpen, bookingSuccessOpen])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  useEffect(() => {
    const handleDocumentClick = (e) => {
      if (pickupWrapperRef.current && !pickupWrapperRef.current.contains(e.target)) {
        setShowPickupSuggestions(false)
      }
      if (dropWrapperRef.current && !dropWrapperRef.current.contains(e.target)) {
        setShowDropSuggestions(false)
      }
      if (cityDropdownWrapperRef.current && !cityDropdownWrapperRef.current.contains(e.target)) {
        setShowCityDropdown(false)
      }
    }

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setShowPickupSuggestions(false)
        setShowDropSuggestions(false)
      }
    }

    document.addEventListener("mousedown", handleDocumentClick)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("mousedown", handleDocumentClick)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [])

  const pickupSuggestions = filterLocationSuggestions(pickup, selectedCity)
  const dropSuggestions = filterLocationSuggestions(drop, selectedCity)

  // Live location detection
  const handleFetchLiveLocation = (e) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }

    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.")
      return
    }

    setIsDetectingLocation(true)
    setLocationStatus("Detecting...")

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        try {
          const res = await fetch(`https://photon.komoot.io/reverse?lon=${longitude}&lat=${latitude}`)
          const data = await res.json()
          if (data && data.features && data.features.length > 0) {
            const p = data.features[0].properties
            const parts = [p.name, p.street, p.suburb || p.district, p.city || p.locality, p.state].filter(Boolean)
            const uniqueParts = parts.filter((v, i, a) => a.indexOf(v) === i)
            const formatted = uniqueParts.join(", ")
            setPickup(formatted || `Current Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`)
          } else {
            setPickup(`Current Location (Hosur - ${latitude.toFixed(4)}, ${longitude.toFixed(4)})`)
          }
          setLocationStatus("Detected")
          setTimeout(() => setLocationStatus(""), 2500)
        } catch (err) {
          setPickup(`Current Location (Hosur - ${latitude.toFixed(4)}, ${longitude.toFixed(4)})`)
          setLocationStatus("Detected")
          setTimeout(() => setLocationStatus(""), 2500)
        } finally {
          setIsDetectingLocation(false)
        }
      },
      (error) => {
        setIsDetectingLocation(false)
        setLocationStatus("")
        setPickup("Current Location (Sipcot Phase 1, Hosur)")
      },
      { timeout: 10000, enableHighAccuracy: true }
    )
  }

  // Static fallback — used only if the /api/logistics/ fetch above fails or
  // hasn't resolved yet, so this page keeps working even if the backend is
  // briefly unreachable.
  const STATIC_PACKERS_PACKAGES = [
    {
      id: "packers_1bhk", name: "1 RK / 1 BHK Shifting", capacity: "Up to 750 kg", price: "₹1,499",
      diagram: <OneBhkDiagram />,
      details: {
        name: "1 RK / 1 BHK Complete Relocation",
        capacity: "Bed, mattress, wardrobe, 10-15 cartons, TV & basic kitchenware",
        crew: "2 Professional Packers + Dedicated Closed Mini Truck",
        materials: "Bubble wrap, corrugated boxes, stretch film & tape included",
        baseFare: "₹1,499 (Includes packing, loading, transport within 10 km)"
      }
    },
    {
      id: "packers_2bhk", name: "2 BHK / 3 BHK Shifting", capacity: "Up to 1,800 kg", price: "₹2,999",
      diagram: <TwoBhkDiagram />,
      details: {
        name: "2 BHK / 3 BHK Full Home Relocation",
        capacity: "Sofa set, dining table, fridge, washing machine, 2 beds & 25+ boxes",
        crew: "4 Experienced Movers & Packers + 14ft Covered Container Truck",
        materials: "Multi-layer bubble wrapping, furniture blankets & heavy-duty cartons",
        baseFare: "₹2,999 (Includes packing, dismantling, loading, transit & unloading)"
      }
    },
    {
      id: "packers_villa", name: "Villa / Office Relocation", capacity: "Custom Load", price: "₹4,499",
      diagram: <ThreeBhkVillaDiagram />,
      details: {
        name: "Villa & Commercial Office Relocation",
        capacity: "Large residential villas, corporate workstations, IT server equipment & machinery",
        crew: "Dedicated Relocation Manager + 6 Crew Members + Multiple Fleet",
        materials: "Wooden crating for fragile items, anti-static packing & transit insurance",
        baseFare: "₹4,499 (Tailored comprehensive shifting package)"
      }
    }
  ]

  const STATIC_HOSUR_AREAS = [
    "Sipcot Phase 1", "Sipcot Phase 2", "Bagalur Road", "Mathigiri",
    "Zuzuvadi", "Avalapalli", "Moranapalli", "Mookandapalli",
    "Denkanikottai Road", "Rayakottai Road", "Thally Road", "Alasanatham",
    "Railway Station Area", "Dinnur", "Kelamangalam Road", "Kamaraj Nagar"
  ]

  const STATIC_POPULAR_ROUTES = [
    { to: "Electronic City Phase 1 & 2", distance: "28 km", time: "Same Day", fare: "₹2,800" },
    { to: "Whitefield / Bengaluru Hub", distance: "42 km", time: "Same Day", fare: "₹3,500" },
    { to: "Bengaluru Central (Majestic)", distance: "40 km", time: "Same Day", fare: "₹3,200" },
    { to: "Krishnagiri Town", distance: "55 km", time: "Same Day", fare: "₹4,200" },
    { to: "Salem Junction", distance: "155 km", time: "1-2 Days", fare: "₹8,500" },
    { to: "Chennai (Koyambedu / Port)", distance: "310 km", time: "1-2 Days", fare: "₹14,500" }
  ]

  // Adapt backend ServiceTier rows to the { id, name, capacity, price,
  // diagram, details } shape the rest of this page already renders.
  function tierToPackage(tier) {
    return {
      id: tier.slug,
      name: tier.name,
      capacity: tier.capacity_label,
      price: `₹${Number(tier.starting_price).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`,
      diagram: PACKERS_DIAGRAM_BY_SLUG[tier.slug] || <OneBhkDiagram />,
      details: {
        name: tier.name,
        capacity: tier.description,
        crew: "Professional packing crew + dedicated vehicle",
        materials: "Bubble wrap, corrugated boxes, stretch film & tape included",
        baseFare: `₹${Number(tier.starting_price).toLocaleString("en-IN", { maximumFractionDigits: 0 })} (Includes packing, loading & transport)`,
      },
      _tierId: tier.id,
    }
  }

  const PACKERS_PACKAGES = fetchedTiers.length ? fetchedTiers.map(tierToPackage) : STATIC_PACKERS_PACKAGES

  const HOSUR_AREAS = serviceAreas.length ? serviceAreas.map((a) => a.name) : STATIC_HOSUR_AREAS

  const POPULAR_ROUTES = fetchedLanes.length
    ? fetchedLanes.map((lane) => ({
        to: lane.destination_label,
        distance: lane.distance_km ? `${Number(lane.distance_km)} km` : "",
        fare: `₹${Number(lane.fare).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`,
        time: lane.eta_label,
        _laneId: lane.id,
      }))
    : STATIC_POPULAR_ROUTES

  // FAQs
  const FAQS = [
    {
      q: "What packing materials are included with CalServices Packers and Movers?",
      a: "We provide high-grade multi-layer bubble wrap, waterproof stretch film, heavy-duty 5-ply corrugated cartons, corner protectors, and heavy furniture blankets to ensure zero damage."
    },
    {
      q: "Do you offer disassembly and reassembly of beds and wardrobes?",
      a: "Yes! Our experienced carpenters and crew handle dismantling of standard cot frames, modular wardrobes, and dining tables, and reassemble them at your new location."
    },
    {
      q: "How early should I book my house shifting in Hosur?",
      a: "While we can arrange on-demand shifting in as little as 2 hours, we recommend booking 24–48 hours in advance to guarantee your preferred moving slot and packing team."
    },
    {
      q: "Is transit insurance covered for fragile and high-value items?",
      a: "Yes, full transit insurance coverage is available for household goods and electronics with swift claim settlement support."
    }
  ]

  const handleGetEstimate = (e) => {
    if (e) e.preventDefault()
    setInventoryBuilderOpen(true)
    setStepperStep(2)
    if (!selectedPackage) setSelectedPackage(PACKERS_PACKAGES[0])
  }

  // Persists the booking to the backend (POST /api/booking/ — see
  // service_requests.BookingCreateView).
  const submitBooking = async () => {
    setBookingError("")
    setBookingSubmitting(true)
    try {
      const today = todayDateString()
      const pkg = selectedPackage || PACKERS_PACKAGES[0]
      const fare = Number(String(pkg.price).replace(/[^0-9.]/g, "")) || 0
      const payload = {
        customer_name: name || "Guest",
        phone,
        service_category: "packers_movers",
        issue_title: `Packers & Movers — ${pkg.name}`,
        description: userType,
        address: pickup || "Hosur",
        drop_address: drop,
        preferred_date: today,
        total_amount: fare,
        payment_method: "COD",
        cart_data: [{
          package: pkg.name, price: pkg.price, route: selectedRoute?.to || null,
          relocation_type: relocationType, inventory: inventoryItems,
        }],
      }
      if (pkg._tierId) payload.logistics_tier = pkg._tierId
      if (selectedRoute?._laneId) payload.logistics_lane = selectedRoute._laneId

      const res = await createBooking(payload)
      setLastBookingId(res?.data?.request_id || res?.request_id || null)
      setBookingSuccessOpen(true)
    } catch (err) {
      setBookingError(err?.body?.message || "Couldn't confirm your booking. Please try again.")
    } finally {
      setBookingSubmitting(false)
    }
  }

  const handleBookNow = () => {
    if (!isSignedIn) {
      setVehicleSelectorOpen(false)
      setLoginModalOpen(true)
    } else {
      setVehicleSelectorOpen(false)
      submitBooking()
    }
  }

  const handleSendOtp = async () => {
    if (!phone || phone.trim().length < 10) return
    setOtpLoading(true)
    setBookingError("")
    try {
      await apiRequestCustomerPhoneOTP(phone)
      setOtpSent(true)
      setOtpStep(true)
    } catch (err) {
      setBookingError(err?.body?.detail || "Couldn't send OTP. Please check the number and try again.")
    } finally {
      setOtpLoading(false)
    }
  }

  const handleVerifyOtp = async () => {
    if (otpValue.length < 6) return
    setOtpLoading(true)
    setBookingError("")
    try {
      await apiVerifyCustomerPhoneOTP(phone, otpValue)
      setIsSignedIn(true)
      setLoginModalOpen(false)
      setOtpStep(false)
      setOtpValue("")
      setOtpSent(false)
      await submitBooking()
    } catch (err) {
      setBookingError(err?.body?.detail || "Invalid OTP. Please try again.")
    } finally {
      setOtpLoading(false)
    }
  }

  const handleItemCount = (item, delta) => {
    setInventoryItems(prev => {
      const current = prev[item] || 0
      const next = Math.max(0, current + delta)
      return {
        ...prev,
        [item]: next
      }
    })
  }

  const totalItemsCount = Object.values(inventoryItems).reduce((sum, val) => sum + val, 0)

  return (
    <div className="min-h-screen bg-[#FAFCFB] text-slate-800 font-sans antialiased">
      {/* ── Top Header Navigation (Uniform Image 2 Style) ─────────────── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(routes.landing)}>
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm">
              <Boxes className="w-5 h-5" strokeWidth={2.5} />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-extrabold tracking-tight text-slate-900 leading-none">
                CalServices
              </span>
              <span className="text-[10px] font-semibold text-emerald-700 tracking-wide uppercase mt-0.5">
                Packers &amp; Movers
              </span>
            </div>
          </div>

          {/* Location Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 text-xs font-bold text-emerald-800">
            <MapPin className="w-3.5 h-3.5 text-emerald-600" />
            <span>Hosur</span>
          </div>

          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <span className="hover:text-emerald-600 cursor-pointer" onClick={() => navigate(routes.landing)}>Services</span>
            <span className="hover:text-emerald-600 cursor-pointer" onClick={() => navigate(routes.landing)}>For Enterprise</span>
            <span className="hover:text-emerald-600 cursor-pointer" onClick={() => navigate(routes.landing)}>Support</span>
            <button
              onClick={() => navigate(routes.login)}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              Sign In
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero Section (Vertical Form Style) ────────────────────── */}
      <section 
        className="relative pt-10 pb-12 sm:pt-16 sm:pb-20 overflow-hidden border-b border-slate-200/50 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url('/hero_packers_bg.png')` }}
      >
        
        {/* Background Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-slate-950/55 to-slate-950/80"></div>

        {/* Background Decorative Elements */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-emerald-100/10 rounded-full blur-3xl opacity-60 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-teal-50/10 rounded-full blur-3xl opacity-60 pointer-events-none"></div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10 flex flex-col md:flex-row items-center gap-12 md:gap-8">
          
          {/* Left Column: Text Content */}
          <div className="flex-1 text-center md:text-left pt-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-emerald-300 text-xs font-bold tracking-wide mb-6 shadow-sm border border-white/25 backdrop-blur-sm">
              <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
              Premium Packers & Movers
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-[44px] font-bold text-white tracking-tight leading-[1.15] mb-5 drop-shadow-lg">
              Affordable and Trusted <br className="hidden lg:block"/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-teal-300">Relocation Services</span>
            </h1>

            <p className="text-sm sm:text-[15px] lg:text-base text-slate-200 leading-relaxed mb-8 max-w-2xl mx-auto lg:mx-0 font-medium drop-shadow">
              Whether you're relocating your 1 BHK, 2 BHK, villa, or office across Hosur and beyond, our verified movers offer safe, hassle-free packing, loading, and on-time delivery.
            </p>

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 sm:gap-6 text-[13px] font-bold text-emerald-300">
              <span className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl shadow-sm border border-white/20 backdrop-blur-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-300" /> Professional Packing
              </span>
              <span className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl shadow-sm border border-white/20 backdrop-blur-sm">
                <ShieldCheck className="w-5 h-5 text-emerald-300" /> Verified Crew
              </span>
            </div>
          </div>

          {/* Right Column: Vertical Form Card */}
          <div className="w-full max-w-[440px] shrink-0 mt-4 md:mt-0 relative z-10 font-sans antialiased">
            <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.08)] overflow-hidden flex flex-col border border-slate-100">
              
              {/* Top Area (Soft Emerald) */}
              <div className="bg-[#ecfdf5] pt-8 pb-6 px-6 relative">
                <div className="relative z-10">
                  <h3 className="text-[24px] font-bold text-[#333333] mb-6 tracking-tight leading-snug">
                    Where are you going to relocate?
                  </h3>
                  
                  {/* Relocation Type Toggle */}
                  <div className="flex items-center bg-[#F4F5F7] p-[5px] rounded-full">
                    <button
                      type="button"
                      onClick={() => setRelocationType("Within City")}
                      className={`flex-1 py-2.5 px-4 text-[14px] font-semibold rounded-full transition-all cursor-pointer ${
                        relocationType === "Within City"
                          ? "bg-[#0B8860] text-white shadow-md"
                          : "text-[#666666] hover:text-[#333333]"
                      }`}
                    >
                      Within City
                    </button>
                    <button
                      type="button"
                      onClick={() => setRelocationType("Between Cities")}
                      className={`flex-1 py-2.5 px-4 text-[14px] font-semibold rounded-full transition-all cursor-pointer ${
                        relocationType === "Between Cities"
                          ? "bg-[#0B8860] text-white shadow-md"
                          : "text-[#666666] hover:text-[#333333]"
                      }`}
                    >
                      Between Cities
                    </button>
                  </div>
                </div>
              </div>

              {/* Form Body */}
              <div className="px-6 py-6 bg-white flex-1 z-10">
                <form onSubmit={handleGetEstimate} className="space-y-5">
                  
                  {relocationType === "Within City" && (
                    <>
                          {/* Select City */}
                          <div className="relative z-20" ref={cityDropdownWrapperRef}>
                            <label className="block text-[13px] font-semibold text-[#484848] mb-2">Select City</label>
                            <div
                              className={`relative w-full h-[54px] pl-4 pr-10 rounded-xl border ${showCityDropdown ? 'border-[#0B8860] ring-1 ring-[#0B8860]' : 'border-[#E0E0E0] hover:border-[#cccccc]'} bg-white flex items-center justify-between cursor-pointer transition-colors`}
                              onClick={() => setShowCityDropdown(!showCityDropdown)}
                            >
                              <span className="text-[15px] font-medium text-[#333333]">{selectedCity}</span>
                              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#666666]">
                                {showCityDropdown ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                              </div>
                            </div>
                            {showCityDropdown && (
                              <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-[#E0E0E0] rounded-xl shadow-lg z-50 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100">
                                {["HOSUR", "BENGALURU", "CHENNAI"].map((city) => (
                                  <div
                                    key={city}
                                    className={`px-4 py-3 text-[14px] font-medium cursor-pointer transition-colors ${
                                      selectedCity === city
                                        ? "bg-[#ecfdf5] text-[#0B8860]"
                                        : "text-[#484848] hover:bg-slate-50"
                                    }`}
                                    onClick={() => {
                                      setSelectedCity(city)
                                      setShowCityDropdown(false)
                                    }}
                                  >
                                    {city}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
  
                          {/* Pickup and Drop Location */}
                          <div>
                            <label className="block text-[13px] font-semibold text-[#484848] mb-3">Select pickup and drop location</label>
                            <div className="relative ml-2.5 border-l-[1.5px] border-[#E0E0E0] pl-6 space-y-4">
                              
                              {/* Pickup Input */}
                              <div className="relative" ref={pickupWrapperRef}>
                                <div className="absolute -left-[30px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-[2.5px] border-[#FF425C] bg-white"></div>
                                <input
                                  type="text"
                                  placeholder={selectedCity === "BENGALURU" ? "Koramangala, Bengaluru, Karnataka" : selectedCity === "CHENNAI" ? "Anna Nagar, Chennai, Tamil Nadu" : "Hosur Bus Stand, Central Hosur"}
                                  value={pickup}
                                  onFocus={() => { setShowPickupSuggestions(true); setShowDropSuggestions(false); }}
                                  onChange={(e) => { setPickup(e.target.value); setShowPickupSuggestions(true); }}
                                  className="w-full h-[54px] px-4 rounded-xl border border-[#E0E0E0] bg-white text-[15px] text-[#333333] focus:border-[#0B8860] focus:ring-1 focus:ring-[#0B8860] outline-none transition-colors placeholder:text-[#999999]"
                                  required
                                />
                                {/* Suggestions */}
                                {showPickupSuggestions && (
                                  <div className="absolute top-full left-0 mt-1 w-full bg-white rounded-xl shadow-xl border border-slate-200 z-50 max-h-48 overflow-y-auto">
                                    {pickupSuggestions.map((loc, idx) => (
                                      <button
                                        key={idx}
                                        type="button"
                                        onMouseDown={(e) => {
                                          e.preventDefault()
                                          setPickup(loc.name)
                                          setShowPickupSuggestions(false)
                                        }}
                                        className="w-full text-left px-4 py-3 hover:bg-slate-50 text-[14px] font-medium text-[#484848] transition-colors cursor-pointer"
                                      >
                                        {loc.name}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
  
                              {/* Drop Input */}
                              <div className="relative" ref={dropWrapperRef}>
                                <div className="absolute -left-[30px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-[2.5px] border-[#0B8860] bg-white"></div>
                                <input
                                  type="text"
                                  placeholder={selectedCity === "BENGALURU" ? "Indiranagar, Bengaluru, Karnataka" : selectedCity === "CHENNAI" ? "T Nagar, Chennai, Tamil Nadu" : "SIPCOT Phase 1, Industrial Area, Hosur"}
                                  value={drop}
                                  onFocus={() => { setShowDropSuggestions(true); setShowPickupSuggestions(false); }}
                                  onChange={(e) => { setDrop(e.target.value); setShowDropSuggestions(true); }}
                                  className="w-full h-[54px] px-4 rounded-xl border border-[#E0E0E0] bg-white text-[15px] text-[#333333] focus:border-[#0B8860] focus:ring-1 focus:ring-[#0B8860] outline-none transition-colors placeholder:text-[#999999]"
                                  required
                                />
                                {/* Suggestions */}
                                {showDropSuggestions && (
                                  <div className="absolute top-full left-0 mt-1 w-full bg-white rounded-xl shadow-xl border border-slate-200 z-50 max-h-48 overflow-y-auto">
                                    {dropSuggestions.map((loc, idx) => (
                                      <button
                                        key={idx}
                                        type="button"
                                        onMouseDown={(e) => {
                                          e.preventDefault()
                                          setDrop(loc.name)
                                          setShowDropSuggestions(false)
                                        }}
                                        className="w-full text-left px-4 py-3 hover:bg-slate-50 text-[14px] font-medium text-[#484848] transition-colors cursor-pointer"
                                      >
                                        {loc.name}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </>
                      )}

                      {relocationType === "Between Cities" && (
                        <>
                          {/* Pickup and Drop Location */}
                          <div>
                            <label className="block text-[13px] font-semibold text-[#484848] mb-3">Search your City</label>
                            <div className="relative ml-2.5 border-l-[1.5px] border-[#E0E0E0] pl-6 space-y-4">
                              
                              {/* Pickup Input */}
                              <div className="relative" ref={pickupWrapperRef}>
                                <div className="absolute -left-[30px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-[2.5px] border-[#FF425C] bg-white"></div>
                                <input
                                  type="text"
                                  placeholder="Search Source City"
                                  value={pickup}
                                  onFocus={() => { setShowPickupSuggestions(true); setShowDropSuggestions(false); }}
                                  onChange={(e) => { setPickup(e.target.value); setShowPickupSuggestions(true); }}
                                  className="w-full h-[54px] px-4 rounded-xl border border-[#E0E0E0] bg-white text-[15px] text-[#333333] focus:border-[#0B8860] focus:ring-1 focus:ring-[#0B8860] outline-none transition-colors placeholder:text-[#999999]"
                                  required
                                />
                                {/* Suggestions */}
                                {showPickupSuggestions && (
                                  <div className="absolute top-full left-0 mt-1 w-full bg-white rounded-xl shadow-xl border border-slate-200 z-50 max-h-48 overflow-y-auto">
                                    {pickupSuggestions.map((loc, idx) => (
                                      <button
                                        key={idx}
                                        type="button"
                                        onMouseDown={(e) => {
                                          e.preventDefault()
                                          setPickup(loc.name)
                                          setShowPickupSuggestions(false)
                                        }}
                                        className="w-full text-left px-4 py-3 hover:bg-slate-50 text-[14px] font-medium text-[#484848] transition-colors cursor-pointer"
                                      >
                                        {loc.name}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
  
                              {/* Drop Input */}
                              <div className="relative" ref={dropWrapperRef}>
                                <div className="absolute -left-[30px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-[2.5px] border-[#0B8860] bg-white"></div>
                                <input
                                  type="text"
                                  placeholder="Search Destination City"
                                  value={drop}
                                  onFocus={() => { setShowDropSuggestions(true); setShowPickupSuggestions(false); }}
                                  onChange={(e) => { setDrop(e.target.value); setShowDropSuggestions(true); }}
                                  className="w-full h-[54px] px-4 rounded-xl border border-[#E0E0E0] bg-white text-[15px] text-[#333333] focus:border-[#0B8860] focus:ring-1 focus:ring-[#0B8860] outline-none transition-colors placeholder:text-[#999999]"
                                  required
                                />
                                {/* Suggestions */}
                                {showDropSuggestions && (
                                  <div className="absolute top-full left-0 mt-1 w-full bg-white rounded-xl shadow-xl border border-slate-200 z-50 max-h-48 overflow-y-auto">
                                    {dropSuggestions.map((loc, idx) => (
                                      <button
                                        key={idx}
                                        type="button"
                                        onMouseDown={(e) => {
                                          e.preventDefault()
                                          setDrop(loc.name)
                                          setShowDropSuggestions(false)
                                        }}
                                        className="w-full text-left px-4 py-3 hover:bg-slate-50 text-[14px] font-medium text-[#484848] transition-colors cursor-pointer"
                                      >
                                        {loc.name}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[13px] font-semibold text-[#484848] mb-3">Select Shifting Date</label>
                            <div className="relative">
                              <input
                                type="date"
                                value={shiftingDateBetween}
                                onChange={(e) => setShiftingDateBetween(e.target.value)}
                                className="w-full h-[54px] px-4 rounded-xl border border-[#E0E0E0] bg-white text-[15px] text-[#333333] focus:border-[#0B8860] focus:ring-1 focus:ring-[#0B8860] outline-none transition-colors placeholder:text-[#999999]"
                              />
                            </div>
                            <div className="mt-3 flex items-center gap-2">
                              <input
                                type="checkbox"
                                id="flexible-date"
                                checked={flexibleDateBetween}
                                onChange={(e) => setFlexibleDateBetween(e.target.checked)}
                                className="w-4 h-4 rounded text-[#0B8860] border-slate-300 focus:ring-[#0B8860]"
                              />
                              <label htmlFor="flexible-date" className="text-[13px] text-[#484848] cursor-pointer">
                                I'm flexible on my shifting date
                              </label>
                            </div>
                          </div>
                        </>
                      )}
  
                      {/* Checkmarks */}
                      <div className="pt-2 pb-2 flex flex-wrap items-center justify-center gap-3 text-[12px] font-medium text-[#666666]">
                        <span className="flex items-center gap-1.5">
                          <Check className="w-[15px] h-[15px] text-[#0B8860]" /> Professional Handling
                        </span>
                        <span className="w-[1px] h-3 bg-[#E0E0E0]"></span>
                        <span className="flex items-center gap-1.5">
                          <Check className="w-[15px] h-[15px] text-[#0B8860]" /> Transparent Pricing
                        </span>
                      </div>
  
                      {/* Button */}
                      <button
                        type="submit"
                        className="w-full h-[54px] bg-[#FF425C] hover:bg-[#E63950] active:scale-[0.99] text-white font-bold text-[16px] rounded-xl transition-all cursor-pointer shadow-sm"
                      >
                        Check Prices
                      </button>
                    </form>
                  </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section: House Shifting Services in Hosur (Uniform Cards Layout) ── */}
      <section className="py-12 sm:py-16 max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            House Shifting Services in Hosur
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-2">
            Safe, insured &amp; end-to-end relocation packages handled by certified packing specialists
          </p>
        </div>

        {/* 3 Centered Cards matching uniform UI layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto mt-8 items-stretch">
          {PACKERS_PACKAGES.map((pkg) => (
            <div
              key={pkg.id}
              className="bg-white rounded-xl border border-slate-200/90 p-6 flex flex-col items-center text-center shadow-none hover:border-slate-300 transition-all justify-between"
            >
              {/* Top Graphic */}
              <div className="w-full flex justify-center items-center my-1">
                {pkg.diagram}
              </div>

              {/* Weight / Crew Pill Badge */}
              <div className="bg-[#F0F4F9] text-slate-800 text-xs font-bold px-3 py-1 rounded-md inline-flex items-center gap-1.5 mt-4">
                <Boxes className="w-3.5 h-3.5 text-slate-900" />
                <span>{pkg.capacity}</span>
              </div>

              {/* Name & Price */}
              <div className="mt-3">
                <h3 className="text-lg font-bold text-slate-900">{pkg.name}</h3>
                <p className="text-sm text-slate-600 mt-1">
                  Starting from <span className="font-bold text-slate-900 text-base">{pkg.price}</span>
                </p>
                <p className="text-[11px] text-slate-500 leading-relaxed mt-2 line-clamp-2">
                  {pkg.details.capacity}
                </p>
              </div>

              {/* Know More dotted link & Book Button */}
              <div className="w-full mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setActivePackageDetails(pkg)}
                  className="text-xs sm:text-sm font-bold text-blue-600 hover:text-blue-700 border-b border-dotted border-blue-600 hover:border-blue-700 cursor-pointer pb-0.5 inline-block focus:outline-none"
                >
                  Know More
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPackage(pkg)
                    handleGetEstimate()
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Select &amp; Book</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 🌟 Section: Comparison Table */}
      <section className="py-6 sm:py-10 max-w-4xl mx-auto px-4 sm:px-6">
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F8F9FA] border-b border-slate-200">
                <th className="py-4 sm:py-5 px-5 sm:px-8 text-sm sm:text-[15px] font-extrabold text-slate-800">Services</th>
                <th className="py-4 sm:py-5 px-5 sm:px-8 text-sm sm:text-[15px] font-extrabold text-[#0B8860] text-center w-[30%] border-l border-slate-200 bg-emerald-50/30">CalServices</th>
                <th className="py-4 sm:py-5 px-5 sm:px-8 text-sm sm:text-[15px] font-extrabold text-slate-500 text-center w-[30%] border-l border-slate-200">Local Vendors</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[
                "Vehicle Assurance",
                "Verified Professional Partners",
                "Regular Update",
                "Packaging & Unpacking",
                "Dismantling & Re-Assemble",
                "Bubble / Foam Wrapping",
                "Damage Assurance"
              ].map((feature, i) => (
                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3.5 sm:py-4 px-5 sm:px-8 text-[13px] sm:text-[14px] font-medium text-slate-700">{feature}</td>
                  <td className="py-3.5 sm:py-4 px-5 sm:px-8 text-center border-l border-slate-100 bg-emerald-50/10">
                    <Check className="w-5 h-5 text-[#0B8860] mx-auto" strokeWidth={2.5} />
                  </td>
                  <td className="py-3.5 sm:py-4 px-5 sm:px-8 text-center border-l border-slate-100">
                    <X className="w-5 h-5 text-red-400 mx-auto" strokeWidth={2.5} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Section: Popular Relocation Routes from Hosur ─────────── */}
      <section className="py-12 sm:py-16 bg-slate-50/80 border-y border-slate-200/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Popular Relocation Routes from Hosur
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Complete packing, door-to-door transit, and zero-breakage guarantee across Tamil Nadu &amp; Karnataka
            </p>
          </div>

          <div className="bg-[#EFF6FF]/60 border border-blue-100 rounded-3xl p-5 sm:p-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {POPULAR_ROUTES.map((route, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setDrop(route.to)
                    setSelectedRoute(route)
                    const bar = document.getElementById("estimate-bar")
                    if (bar) bar.scrollIntoView({ behavior: "smooth", block: "center" })
                  }}
                  className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/70 hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm sm:text-base font-bold text-slate-800 group-hover:text-emerald-700 transition-colors">
                      to {route.to} <span className="text-xs font-semibold text-slate-400">({route.distance})</span>
                    </span>
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                      {route.time}
                    </span>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                      fare from <span className="text-base font-extrabold text-slate-900">{route.fare}</span>
                    </span>
                    <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      Select <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Section: Areas We Serve in Hosur (Uniform Style) ─────── */}
      <section className="py-12 max-w-6xl mx-auto px-4 sm:px-6 text-center">
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mb-6">
          Areas We Serve in Hosur
        </h2>
        <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 max-w-4xl mx-auto">
          {HOSUR_AREAS.map((area, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setPickup(`${area}, Hosur`)
                const bar = document.getElementById("estimate-bar")
                if (bar) bar.scrollIntoView({ behavior: "smooth", block: "center" })
              }}
              className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-200/80 hover:border-emerald-500 hover:text-emerald-700 text-xs sm:text-sm font-medium text-slate-700 shadow-sm transition-all cursor-pointer"
            >
              {area}
            </button>
          ))}
        </div>
      </section>

      {/* ── Section: Think Logistics, Think CalServices! (App Banner) ── */}
      <section className="py-12 bg-emerald-900 text-white relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="text-center md:text-left max-w-lg">
            <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
              Mobile App Experience
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1">
              Think Logistics, Think CalServices!
            </h2>
            <p className="text-sm text-emerald-100 mt-2">
              Get the CalServices mobile app to manage your household shifting, track container trucks in real time, and download invoices easily.
            </p>
            <div className="mt-5 flex items-center justify-center md:justify-start gap-3">
              <div className="px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur rounded-xl border border-white/20 text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors">
                <span>Google Play</span>
              </div>
              <div className="px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur rounded-xl border border-white/20 text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors">
                <span>App Store</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center bg-white text-slate-900 p-5 rounded-3xl shadow-2xl">
            <QRCodeGraphic className="w-32 h-32" />
            <span className="text-xs font-bold text-slate-700 mt-3">Scan to download our app!</span>
          </div>
        </div>
      </section>

      {/* ── Section: How CalServices Packers and Movers Works ── */}
      <section className="py-12 max-w-6xl mx-auto px-4 sm:px-6">
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight text-center mb-10">
          How CalServices Packers and Movers Works?
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          <div className="hidden lg:block absolute top-8 left-[12%] right-[12%] h-[2px] bg-slate-200 border-t-2 border-dashed border-slate-300"></div>
          
          <div className="flex flex-col items-center text-center relative z-10">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4 border-4 border-white shadow-sm">
              <ClipboardList className="w-8 h-8 text-indigo-500" />
            </div>
            <h3 className="font-bold text-slate-900 mb-2">Share your Requirement</h3>
            <p className="text-xs text-slate-500">Give your move details and preferred timing to design a streamlined logistics strategy.</p>
          </div>
          
          <div className="flex flex-col items-center text-center relative z-10">
            <div className="w-16 h-16 rounded-2xl bg-rose-50 flex items-center justify-center mb-4 border-4 border-white shadow-sm">
              <MessageSquare className="w-8 h-8 text-rose-500" />
            </div>
            <h3 className="font-bold text-slate-900 mb-2">Receive Instant Quote</h3>
            <p className="text-xs text-slate-500">Get a firm, transparent estimate instantly. Our fixed-rate model has no surprise additions.</p>
          </div>
          
          <div className="flex flex-col items-center text-center relative z-10">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mb-4 border-4 border-white shadow-sm">
              <User className="w-8 h-8 text-amber-500" />
            </div>
            <h3 className="font-bold text-slate-900 mb-2">Assign Quality Expert</h3>
            <p className="text-xs text-slate-500">To ensure safe relocation, a quality service expert will be allotted to your movement.</p>
          </div>
          
          <div className="flex flex-col items-center text-center relative z-10">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mb-4 border-4 border-white shadow-sm">
              <Truck className="w-8 h-8 text-emerald-500" />
            </div>
            <h3 className="font-bold text-slate-900 mb-2">Professional Transport</h3>
            <p className="text-xs text-slate-500">Staff handles heavy lifting and loading with care using premium materials.</p>
          </div>
        </div>
      </section>

      {/* ── Section: CalServices vs Local Vendors ── */}
      <section className="py-12 bg-white border-y border-slate-200/70">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight text-center mb-8">
            CalServices compared to local vendors
          </h2>
          <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50">
                  <th className="p-4 font-bold text-slate-700 border-b border-slate-200">Services</th>
                  <th className="p-4 font-bold text-emerald-700 border-b border-l border-slate-200 text-center bg-emerald-50/50">CalServices</th>
                  <th className="p-4 font-bold text-slate-500 border-b border-l border-slate-200 text-center">Local Vendors</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {[
                  "Vehicle Assurance",
                  "Verified Professional Partners",
                  "Regular Update",
                  "Packaging & Unpacking",
                  "Dismantling & Re-Assemble",
                  "Bubble / Foam Wrapping",
                  "Damage Assurance"
                ].map((item, i) => (
                  <tr key={i} className="hover:bg-slate-50/50">
                    <td className="p-4 border-b border-slate-100 text-slate-700 font-medium">{item}</td>
                    <td className="p-4 border-b border-l border-slate-100 text-center bg-emerald-50/20">
                      <Check className="w-5 h-5 text-emerald-500 mx-auto" />
                    </td>
                    <td className="p-4 border-b border-l border-slate-100 text-center">
                      <X className="w-5 h-5 text-rose-400 mx-auto" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── Section: Value Added Services ── */}
      <section className="py-12 max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-10">
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Need an Extra Hand?
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-2">
            Experience 100% damage-free shifting. Enhance your house shifting with our Value Added Services.
          </p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-[#f8faff] rounded-2xl p-6 text-center hover:shadow-md transition-shadow border border-blue-200/60">
            <div className="w-12 h-12 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-3">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="font-bold text-slate-900 mb-1">Rope Pulling Services</h3>
            <p className="text-xs text-slate-500">Assistance from experts in handling heavy goods that need extra care</p>
          </div>
          
          <div className="bg-[#f0f3fa] rounded-2xl p-6 text-center hover:shadow-md transition-shadow border border-slate-200/60">
            <div className="w-12 h-12 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-3">
              <Settings className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="font-bold text-slate-900 mb-1">Appliance Installation</h3>
            <p className="text-xs text-slate-500">Un-installation and installation of electrical appliances by professionals</p>
          </div>
          
          <div className="bg-[#f0f3fa] rounded-2xl p-6 text-center hover:shadow-md transition-shadow border border-slate-200/60">
            <div className="w-12 h-12 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-3">
              <Zap className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="font-bold text-slate-900 mb-1">Professional Electrician</h3>
            <p className="text-xs text-slate-500">Expertise at your rescue for complex wiring and setups</p>
          </div>
          
          <div className="bg-[#f0f3fa] rounded-2xl p-6 text-center hover:shadow-md transition-shadow border border-slate-200/60">
            <div className="w-12 h-12 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-3">
              <Wrench className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="font-bold text-slate-900 mb-1">Professional Carpenter</h3>
            <p className="text-xs text-slate-500">Professionally skilled carpenters in furniture handling</p>
          </div>
        </div>
      </section>

      {/* ── Section: Other Services to Choose From ─────────────── */}
      <section className="py-12 sm:py-16 bg-[#FAFCFB] border-t border-slate-200/60 max-w-4xl mx-auto px-4 sm:px-6 text-center">
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mb-8">
          Other Services to Choose From
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Trucks & Mini Trucks Card */}
          <div
            onClick={() => navigate(routes.truck_booking_hosur)}
            className="bg-[#f0f3fa] rounded-3xl p-7 border border-slate-200/60 hover:shadow-lg transition-all cursor-pointer flex flex-col items-center gap-3 group"
          >
            <div className="h-24 flex items-center justify-center">
              <TruckGraphic className="w-28 h-20 group-hover:scale-105 transition-transform" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Trucks &amp; Mini Trucks</h3>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); navigate(routes.truck_booking_hosur) }}
              className="w-9 h-9 rounded-full bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center shadow-md transition-colors cursor-pointer mt-1"
            >
              <ArrowRight className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* Two Wheelers Card */}
          <div
            onClick={() => navigate(routes.two_wheeler_booking_hosur)}
            className="bg-[#f0f3fa] rounded-3xl p-7 border border-slate-200/60 hover:shadow-lg transition-all cursor-pointer flex flex-col items-center gap-3 group"
          >
            <div className="h-24 flex items-center justify-center">
              <TwoWheelerGraphic className="w-28 h-20 group-hover:scale-105 transition-transform" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Two Wheelers</h3>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); navigate(routes.two_wheeler_booking_hosur) }}
              className="w-9 h-9 rounded-full bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center shadow-md transition-colors cursor-pointer mt-1"
            >
              <ArrowRight className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      </section>

      {/* ── Section: Relocation Details in Hosur ───────────────── */}
      <section className="py-12 bg-white border-y border-slate-200/70">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mb-4">
            Professional Packers and Movers in Hosur
          </h2>
          <div className="text-xs sm:text-sm text-slate-600 leading-relaxed space-y-3">
            <p>
              Shift your home or corporate office stress-free with CalServices! Our certified packing professionals use premium materials to pack every fragile item, manage heavy lifting, and transport your possessions safely across Hosur, SIPCOT industrial zones, and intercity destinations.
            </p>
          </div>
        </div>
      </section>

      {/* ── Section: FAQs ──────────────────────────────────────── */}
      <section className="py-12 bg-[#FAFCFB] border-b border-slate-200/60">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight text-center mb-8">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {FAQS.map((faq, idx) => (
              <div
                key={faq.q}
                className="border border-slate-200 rounded-2xl bg-white overflow-hidden transition-all shadow-2xs"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full p-4 sm:p-5 text-left font-bold text-sm text-slate-800 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${openFaq === idx ? "rotate-180" : ""}`} />
                </button>
                {openFaq === idx && (
                  <div className="px-4 sm:px-5 pb-5 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Modals: Package Details, Selector, Login/OTP, Success ── */}
      {/* 1. Package Details Modal */}
      {activePackageDetails && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-extrabold text-slate-900">{activePackageDetails.details.name}</h3>
              <button
                onClick={() => setActivePackageDetails(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-center py-4 bg-slate-50 rounded-2xl mb-4">
              {activePackageDetails.diagram}
            </div>

            <div className="space-y-3 text-xs text-slate-700">
              <div className="py-1.5 border-b border-slate-100">
                <span className="font-semibold text-slate-500 block mb-1">What's Included:</span>
                <span className="font-bold text-slate-900">{activePackageDetails.details.capacity}</span>
              </div>
              <div className="py-1.5 border-b border-slate-100">
                <span className="font-semibold text-slate-500 block mb-1">Crew &amp; Vehicle:</span>
                <span className="font-bold text-slate-900">{activePackageDetails.details.crew}</span>
              </div>
              <div className="py-1.5 border-b border-slate-100">
                <span className="font-semibold text-slate-500 block mb-1">Packaging Materials:</span>
                <span className="text-slate-800">{activePackageDetails.details.materials}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="font-semibold text-slate-500">Estimated Base Rate:</span>
                <span className="font-bold text-emerald-700">{activePackageDetails.details.baseFare}</span>
              </div>
            </div>

            <button
              onClick={() => {
                setSelectedPackage(activePackageDetails)
                setActivePackageDetails(null)
                handleGetEstimate()
              }}
              className="w-full mt-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer"
            >
              Proceed to Booking
            </button>
          </div>
        </div>
      )}

      {/* 2. Package Selector Modal */}
      {vehicleSelectorOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">Choose Shifting Package</h3>
                <p className="text-xs text-slate-500">
                  {pickup || "Hosur Pickup"} &rarr; {drop || "Hosur Drop"}
                </p>
              </div>
              <button
                onClick={() => setVehicleSelectorOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 my-4">
              {PACKERS_PACKAGES.map((pkg) => {
                const isSelected = selectedPackage?.id === pkg.id
                return (
                  <div
                    key={pkg.id}
                    onClick={() => setSelectedPackage(pkg)}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between gap-4 ${
                      isSelected
                        ? "border-emerald-600 bg-emerald-50/40 shadow-sm"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <div className="w-24 h-16 flex items-center justify-center shrink-0">
                      {pkg.diagram}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900">{pkg.name}</h4>
                        <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                          {pkg.capacity}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                        {pkg.details.crew}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-base font-extrabold text-slate-900">{pkg.price}</div>
                      <span className="text-[10px] text-emerald-700 font-semibold">Base fare</span>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex items-center justify-between mb-4">
              <span className="flex items-center gap-1.5 font-medium">
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                Verified moving crew assigned on booking
              </span>
              <span className="font-bold text-slate-900">Cash / UPI / Cards</span>
            </div>

            <button
              type="button"
              onClick={handleBookNow}
              disabled={bookingSubmitting}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer"
            >
              {bookingSubmitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Confirming...</>
              ) : (
                <><span>Book Now</span><ArrowRight className="w-4 h-4" /></>
              )}
            </button>
            {isSignedIn && bookingError && (
              <p style={{ color: "var(--bad)", fontSize: 12, marginTop: 8, textAlign: "center" }}>{bookingError}</p>
            )}
          </div>
        </div>
      )}

      {/* 2.5 Inventory Builder Stepper Modal */}
      {inventoryBuilderOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] w-full max-w-[1000px] h-[85vh] flex flex-col shadow-2xl overflow-hidden font-sans antialiased border border-slate-100">
            {/* Header (Solid Green) */}
            <div className="bg-[#0B8860] text-white pt-5 pb-4 px-6 flex items-center justify-between relative">
              <div className="flex-1 flex justify-center max-w-[600px] mx-auto w-full relative">
                {/* Progress Line */}
                <div className="absolute top-[35%] left-[12%] right-[12%] h-[1px] bg-white/30 -z-0"></div>
                
                {[
                  { step: 1, label: "Location" },
                  { step: 2, label: "Add Items" },
                  { step: 3, label: "Slots" },
                  { step: 4, label: "Summary" }
                ].map((s) => (
                  <div key={s.step} className="flex-1 flex flex-col items-center justify-center text-center z-10">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-bold mb-1.5 ${
                      stepperStep > s.step ? "bg-white text-[#0B8860]" :
                      stepperStep === s.step ? "bg-[#33a886] text-white" :
                      "bg-[#0B8860] text-white border border-white/40"
                    }`}>
                      {stepperStep > s.step ? <Check className="w-4 h-4" /> : s.step}
                    </div>
                    <span className={`text-[11px] font-medium tracking-wide ${stepperStep === s.step ? "text-white font-bold" : "text-white/70"}`}>
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setInventoryBuilderOpen(false)}
                className="absolute right-6 top-6 w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-[#F4F5F7] p-4 lg:p-6 gap-6">
              {/* Left Column (Inventory Builder) */}
              <div className="flex-1 flex flex-col overflow-hidden relative bg-white rounded-[20px] shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-100">
                {stepperStep === 2 ? (
                  <>

                {/* Sub-header: Back button & Title */}
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button onClick={() => setInventoryBuilderOpen(false)} className="text-slate-400 hover:text-[#0B8860] cursor-pointer">
                      <ArrowRight className="w-5 h-5 rotate-180" />
                    </button>
                    <h2 className="text-xl font-bold text-slate-800">Add your Inventory</h2>
                  </div>
                  <button className="text-[11px] font-bold text-[#0B8860] border border-[#0B8860]/30 bg-[#0B8860]/5 px-3 py-1.5 rounded-full flex items-center gap-1.5 hover:bg-[#0B8860]/10 transition-colors cursor-pointer">
                    <Phone className="w-3.5 h-3.5" /> Get a call
                  </button>
                </div>

                {/* Search Bar */}
                <div className="px-6 py-4 border-b border-slate-100">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Search for any item" 
                      value={inventorySearchQuery}
                      onChange={(e) => setInventorySearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13px] outline-none focus:border-[#0B8860] focus:bg-white transition-colors"
                    />
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-3 px-6 py-4 overflow-x-auto hide-scrollbar border-b border-slate-100">
                  {Object.keys(INVENTORY_DATA).map(cat => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`whitespace-nowrap px-4 py-1.5 rounded-full text-[13px] font-semibold transition-all border cursor-pointer ${
                        activeCategory === cat 
                          ? "bg-[#0B8860] text-white border-[#0B8860]" 
                          : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Items List */}
                <div className="flex-1 overflow-y-auto px-6 pb-24 bg-slate-50/50 pt-4">
                  
                  {/* Category Accordion Header */}
                  <div className="bg-white rounded-t-xl border-x border-t border-slate-200 p-4 flex items-center justify-between cursor-pointer">
                    <h3 className="font-bold text-slate-800 text-[15px]">{activeCategory}</h3>
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                  </div>
                  
                  {/* Banner */}
                  <div className="bg-[#0B8860]/5 border-x border-b border-[#0B8860]/20 p-3 flex items-center gap-2 text-[12px] text-[#0B8860] font-medium">
                    <span className="text-[14px]">📦</span>
                    What we pack in {activeCategory}
                  </div>
                  
                  {/* Subcategories Accordions */}
                  <div className="border border-slate-200 rounded-b-xl overflow-hidden bg-white mb-6">
                    {Object.entries(INVENTORY_DATA[activeCategory]).map(([subCat, items]) => {
                      // Filter items by search query if any
                      const filteredItems = items.filter(item => item.toLowerCase().includes(inventorySearchQuery.toLowerCase()))
                      
                      // Don't render subcategory if it has no items matching search
                      if (filteredItems.length === 0) return null
                      
                      const isExpanded = !!expandedSubcategories[subCat] // Default to collapsed
                      
                      return (
                        <div key={subCat} className="border-b border-slate-100 last:border-b-0">
                          {/* Accordion Toggle */}
                          <div 
                            onClick={() => setExpandedSubcategories(prev => ({...prev, [subCat]: !isExpanded}))}
                            className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-[13px] text-slate-700">{subCat}</span>
                              {(() => {
                                const addedCount = filteredItems.reduce((acc, item) => acc + (inventoryItems[item] || 0), 0);
                                if (addedCount > 0) {
                                  return (
                                    <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 ml-1">
                                      {addedCount} added
                                    </span>
                                  )
                                }
                                return null;
                              })()}
                            </div>
                            <div className="p-1.5 -mr-1.5 rounded-full hover:bg-slate-200 transition-colors">
                              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                            </div>
                          </div>
                          
                          {/* Items */}
                          {isExpanded && (
                            <div className="px-4 pb-4">
                              <div className="border-l-2 border-slate-100 ml-2 pl-4 space-y-4 pt-2">
                                {filteredItems.map((item) => {
                                  const count = inventoryItems[item] || 0
                                  return (
                                    <div key={item} className="flex items-center justify-between">
                                      <span className="text-[13px] text-slate-600 font-medium">{item}</span>
                                      {count > 0 ? (
                                        <div className="flex items-center border border-[#0B8860] rounded-md overflow-hidden text-[#0B8860] bg-white h-8">
                                          <button onClick={() => handleItemCount(item, -1)} className="w-8 h-full flex items-center justify-center text-lg font-medium cursor-pointer hover:bg-[#0B8860]/10 transition-colors">-</button>
                                          <span className="font-bold text-sm min-w-[20px] text-center">{count}</span>
                                          <button onClick={() => handleItemCount(item, 1)} className="w-8 h-full flex items-center justify-center text-lg font-medium cursor-pointer hover:bg-[#0B8860]/10 transition-colors">+</button>
                                        </div>
                                      ) : (
                                        <button onClick={() => handleItemCount(item, 1)} className="w-8 h-8 flex items-center justify-center rounded-md border border-[#0B8860] text-[#0B8860] hover:bg-[#0B8860]/10 transition-colors cursor-pointer bg-white">
                                          <Plus className="w-4 h-4" />
                                        </button>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Footer Bar */}
                <div className="absolute bottom-0 left-0 right-0 bg-white p-4 sm:px-6 flex items-center justify-between shadow-[0_-8px_20px_rgba(0,0,0,0.04)] border-t border-slate-100">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Added items</span>
                    <span className="text-lg font-black text-slate-900">{totalItemsCount}</span>
                  </div>
                  <button
                    onClick={() => {
                      setStepperStep(3)
                    }}
                    disabled={totalItemsCount === 0}
                    className="px-10 py-3 bg-[#0B8860] hover:bg-[#097350] focus:bg-[#097350] text-white text-[14px] font-bold rounded-xl transition-all cursor-pointer disabled:bg-[#CBD5E1] disabled:cursor-not-allowed aria-disabled:bg-[#CBD5E1] aria-disabled:cursor-not-allowed"
                    aria-disabled={totalItemsCount === 0}
                  >
                    Continue
                  </button>
                </div>
              
                  </>
                ) : stepperStep === 3 ? (
                  <>
                    {/* Sub-header for Step 3 */}
                    <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <button onClick={() => setStepperStep(2)} className="text-slate-400 hover:text-[#0B8860] cursor-pointer">
                          <ArrowRight className="w-5 h-5 rotate-180" />
                        </button>
                        <h2 className="text-xl font-bold text-slate-800">Confirm your shifting Date & Slot</h2>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto px-6 pb-28 pt-4">
                      {/* Date Selector */}
                      <p className="text-[13px] text-slate-600 mb-3 font-semibold">Select Pickup Date</p>
                      <div className="flex items-center gap-3 overflow-x-auto hide-scrollbar pb-2 mb-6">
                        {SHIFTING_DATES.map((dateObj) => (
                          <div 
                            key={dateObj.id}
                            onClick={() => setSelectedDate(dateObj)}
                            className={`min-w-[85px] p-3 rounded-xl border flex flex-col items-center justify-center cursor-pointer transition-all ${
                              selectedDate?.id === dateObj.id 
                                ? "border-[#0B8860] bg-[#0B8860]/5 shadow-sm" 
                                : "border-slate-200 bg-white hover:border-slate-300"
                            }`}
                          >
                            <span className={`text-[11px] font-bold ${selectedDate?.id === dateObj.id ? "text-[#0B8860]" : "text-slate-500"}`}>{dateObj.label}</span>
                            <span className="text-[13px] font-black text-slate-800 mt-0.5">{dateObj.value}</span>
                          </div>
                        ))}
                      </div>

                      {/* Warning Banner */}
                      <div className="bg-[#FFF5E5] border border-orange-200 rounded-xl p-3 flex items-center gap-3 mb-6">
                        <Zap className="w-4 h-4 text-orange-500 shrink-0 fill-orange-500" />
                        <span className="text-[12px] font-bold text-orange-600">Slots Filling Fast, Book Now!</span>
                      </div>

                      {/* Slot Selector */}
                      <p className="text-[13px] text-slate-600 mb-3 font-semibold">Select Pickup Slot</p>
                      <div className="space-y-4">
                        {Object.entries(SHIFTING_SLOTS).map(([timeOfDay, slots]) => {
                          const isExpanded = expandedSlotCategory === timeOfDay
                          
                          return (
                            <div key={timeOfDay} className="border-b border-slate-100 last:border-0 pb-4 last:pb-0">
                              <div 
                                className="flex items-center justify-between cursor-pointer mb-2 group"
                                onClick={() => setExpandedSlotCategory(isExpanded ? null : timeOfDay)}
                              >
                                <div className="flex items-center gap-2">
                                  {timeOfDay === "Morning" && <span className="text-slate-400">⛅</span>}
                                  {timeOfDay === "Afternoon" && <span className="text-slate-400">☀️</span>}
                                  {timeOfDay === "Evening" && <span className="text-slate-400">🌅</span>}
                                  <span className="text-[13px] font-semibold text-slate-600 group-hover:text-slate-800 transition-colors">{timeOfDay}</span>
                                </div>
                                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                              </div>
                              
                              {isExpanded && (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
                                  {slots.map(slot => (
                                    <div 
                                      key={slot}
                                      onClick={() => setSelectedSlot(slot)}
                                      className={`py-2 px-1 rounded-xl border text-center cursor-pointer transition-all ${
                                        selectedSlot === slot 
                                          ? "border-[#0B8860] bg-[#0B8860]/5 text-[#0B8860] font-bold shadow-sm" 
                                          : "border-slate-200 bg-white hover:border-slate-300 text-slate-600 font-medium"
                                      }`}
                                    >
                                      <span className="text-[12px]">{slot}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Step 3 Footer */}
                    <div className="absolute bottom-0 left-0 right-0 bg-white shadow-[0_-8px_20px_rgba(0,0,0,0.04)]">
                      {/* Carton Recommendation Banner */}
                      <div className="bg-[#F8F9FA] px-6 py-3 border-t border-slate-100 flex items-start gap-2">
                        <span className="text-lg leading-none">📦</span>
                        {(() => {
                          const cartonItems = [
                            ...(INVENTORY_DATA["Cartons"]?.["Self Carton"] || []), 
                            ...(INVENTORY_DATA["Cartons"]?.["NoBroker Carton"] || [])
                          ];
                          const addedCartons = cartonItems.reduce((acc, item) => acc + (inventoryItems[item] || 0), 0);
                          return (
                            <p className="text-[11px] text-slate-600 leading-relaxed pt-0.5">
                              You've added {addedCartons} carton{addedCartons !== 1 ? 's' : ''}. Based on your inventory, we estimate you'll need 3 for small items like books and clothes. 
                              <span className="text-[#0B8860] font-bold hover:underline cursor-pointer ml-1 inline-block" onClick={() => {setStepperStep(2); setActiveCategory("Cartons")}}>Add 3 Cartons</span>
                            </p>
                          );
                        })()}
                      </div>
                      
                      <div className="px-6 py-4 border-t border-slate-100">
                        <button
                          onClick={() => {
                            setStepperStep(4)
                          }}
                          disabled={!selectedDate || !selectedSlot}
                          className="w-full py-3.5 bg-[#0B8860] hover:bg-[#097754] disabled:bg-[#CBD5E1] text-white text-[14px] font-bold rounded-xl transition-all shadow-md shadow-[#0B8860]/20 disabled:shadow-none cursor-pointer disabled:cursor-not-allowed"
                        >
                          Confirm
                        </button>
                      </div>
                    </div>
                  </>
                ) : stepperStep === 4 ? (
                  <>
                    <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <button onClick={() => setStepperStep(3)} className="text-slate-400 hover:text-[#0B8860] cursor-pointer">
                          <ArrowRight className="w-5 h-5 rotate-180" />
                        </button>
                        <h2 className="text-xl font-bold text-slate-800">Booking Summary</h2>
                      </div>
                      <button className="text-[11px] font-bold text-[#0B8860] border border-[#0B8860]/30 bg-[#0B8860]/5 px-3 py-1.5 rounded-full flex items-center gap-1.5 hover:bg-[#0B8860]/10 transition-colors cursor-pointer">
                        <Phone className="w-3.5 h-3.5" /> Get a call
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6 pb-32">
                      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-bold text-slate-800 text-base">Movement Details</h3>
                          <button onClick={() => setStepperStep(1)} className="text-[13px] font-bold text-[#0B8860] hover:underline cursor-pointer">Edit</button>
                        </div>
                        <div className="space-y-4 relative ml-1">
                          <div className="absolute left-[7px] top-[14px] bottom-[14px] w-[1px] bg-slate-200 border-l border-dashed border-slate-300"></div>
                          
                          <div className="flex items-start gap-4 relative bg-white">
                            <div className="mt-0.5 relative z-10 w-4 h-4 bg-white rounded-full flex items-center justify-center">
                              <MapPin className="w-3.5 h-3.5 text-slate-700" />
                            </div>
                            <div className="pt-0.5">
                              <p className="text-[14px] text-slate-800 font-medium leading-relaxed">{pickup || "Hosur Origin"}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <input type="checkbox" className="w-3.5 h-3.5 accent-[#0B8860]" />
                                <span className="text-[12px] text-slate-500">Is service lift available<span className="text-red-500">*</span></span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-start gap-4 relative bg-white">
                            <div className="mt-0.5 relative z-10 w-4 h-4 bg-white rounded-full flex items-center justify-center">
                              <MapPin className="w-3.5 h-3.5 text-slate-700" />
                            </div>
                            <div className="pt-0.5">
                              <p className="text-[14px] text-slate-800 font-medium leading-relaxed">{drop || "Destination"}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <input type="checkbox" className="w-3.5 h-3.5 accent-[#0B8860]" />
                                <span className="text-[12px] text-slate-500">Is service lift available<span className="text-red-500">*</span></span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                              <Calendar className="w-4 h-4 text-indigo-600" />
                            </div>
                            <span className="text-[13px] text-slate-700 font-medium">
                              {selectedDate ? `${selectedDate.fullDate.toLocaleDateString("en-US", {month:"short", day:"numeric", year:"numeric"})} | ` : ""}{selectedSlot || "Time not selected"}
                            </span>
                          </div>
                          <button onClick={() => setStepperStep(3)} className="text-[13px] font-bold text-slate-500 border border-slate-200 px-4 py-1.5 rounded-full hover:bg-slate-50 transition-colors cursor-pointer">Explore Slots</button>
                        </div>
                      </div>

                      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex items-center justify-between cursor-pointer hover:border-[#0B8860] transition-colors" onClick={() => setStepperStep(2)}>
                        <h3 className="font-bold text-slate-800 text-base">Your Added Inventory ({Object.values(inventoryItems).reduce((a, b) => a + b, 0)})</h3>
                        <ChevronDown className="w-5 h-5 text-slate-400 -rotate-90" />
                      </div>
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-100 p-4 shadow-[0_-8px_20px_rgba(0,0,0,0.04)] flex items-center justify-between z-10">
                      <div>
                        <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider mb-0.5">Token Amount</p>
                        <p className="text-xl font-black text-slate-800">₹ 455</p>
                      </div>
                      <button
                        onClick={() => {
                          setInventoryBuilderOpen(false)
                          handleBookNow()
                        }}
                        className="px-10 py-3.5 bg-[#0B8860] hover:bg-[#097754] text-white text-[15px] font-bold rounded-xl transition-all shadow-md shadow-[#0B8860]/20 cursor-pointer"
                      >
                        Confirm Booking
                      </button>
                    </div>
                  </>
                ) : null}
</div>

              {/* Right Column (Booking Details) */}
              <div className="hidden lg:block w-[340px] relative shrink-0">
                
                <div className="bg-white rounded-[20px] shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-100 p-6 sticky top-0">
                  <h3 className="font-extrabold text-slate-800 text-[14px] mb-5">Booking Details</h3>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Address</span>
                    <button className="text-[12px] font-bold text-[#0B8860] hover:underline cursor-pointer">Edit</button>
                  </div>
                  
                  <div className="space-y-6 relative ml-1">
                    {/* Connecting line */}
                    <div className="absolute left-[7px] top-[14px] bottom-[14px] w-[1px] bg-slate-200 border-l border-dashed border-slate-300"></div>
                    
                    <div className="flex items-start gap-4 relative bg-white">
                      <div className="mt-0.5 relative z-10 w-4 h-4 bg-white rounded-full flex items-center justify-center">
                        <MapPin className="w-3.5 h-3.5 text-[#0B8860]" />
                      </div>
                      <p className="text-[12px] text-slate-700 font-medium leading-relaxed pt-0.5">{pickup || "Hosur Origin"}</p>
                    </div>
                    <div className="flex items-start gap-4 relative bg-white">
                      <div className="mt-0.5 relative z-10 w-4 h-4 bg-white rounded-full flex items-center justify-center">
                        <MapPin className="w-3.5 h-3.5 text-rose-500" />
                      </div>
                      <p className="text-[12px] text-slate-700 font-medium leading-relaxed pt-0.5">{drop || "Destination"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Login & OTP Verification Modal */}
      {loginModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">
                  {otpStep ? "Enter OTP Verification" : "Sign In to Complete Booking"}
                </h3>
                <p className="text-xs text-slate-500">
                  {otpStep ? `We sent a 4-digit code to +91 ${phone}` : "Quick verification to confirm your moving booking"}
                </p>
              </div>
              <button
                onClick={() => {
                  setLoginModalOpen(false)
                  setOtpStep(false)
                }}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {!otpStep ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mobile Number <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus-within:border-emerald-500 focus-within:bg-white transition-all">
                    <span className="text-xs font-bold text-slate-500 mr-2">+91</span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, "").slice(0, 10))}
                      placeholder="Enter 10-digit mobile number"
                      className="w-full bg-transparent text-xs font-semibold text-slate-800 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="name@example.com for invoice & insurance"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-emerald-500 focus:bg-white transition-all"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="pm-whatsapp"
                    checked={loginWhatsapp}
                    onChange={(e) => setLoginWhatsapp(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <label htmlFor="pm-whatsapp" className="text-xs text-slate-600 cursor-pointer">
                    Receive moving schedule &amp; supervisor details on WhatsApp
                  </label>
                </div>

                {bookingError && (
                  <p style={{ color: "var(--bad)", fontSize: 12, textAlign: "center" }}>{bookingError}</p>
                )}

                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={otpLoading || !phone || phone.length < 10}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  {otpLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Generate OTP</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    Enter 6-digit OTP
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={otpValue}
                    onChange={(e) => setOtpValue(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="• • • • • •"
                    className="w-full text-center text-2xl tracking-[1em] font-extrabold bg-slate-50 border border-slate-200 rounded-xl py-3 text-slate-900 outline-none focus:border-emerald-500 focus:bg-white"
                  />
                </div>

                {bookingError && (
                  <p style={{ color: "var(--bad)", fontSize: 12, textAlign: "center" }}>{bookingError}</p>
                )}

                <button
                  type="button"
                  onClick={handleVerifyOtp}
                  disabled={otpLoading || bookingSubmitting || otpValue.length < 6}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
                >
                  {(otpLoading || bookingSubmitting) && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{bookingSubmitting ? "Confirming booking..." : otpLoading ? "Verifying..." : "Verify & Confirm Booking"}</span>
                </button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setOtpStep(false)}
                    className="text-xs text-slate-500 hover:text-emerald-600 font-semibold cursor-pointer"
                  >
                    &larr; Change Mobile Number
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. Booking Confirmation Success Modal */}
      {bookingSuccessOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <h3 className="text-xl font-extrabold text-slate-900 mb-2">
              Shifting Booking Requested Successfully!
            </h3>
            <p className="text-sm font-semibold text-emerald-700 bg-emerald-50 py-2.5 px-4 rounded-xl mb-4">
              Our service partner will contact you shortly
            </p>

            <div className="bg-slate-50 rounded-2xl p-4 text-left text-xs space-y-2 border border-slate-200 mb-6">
              {lastBookingId && (
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Booking ID:</span>
                  <span className="font-bold text-emerald-700">{lastBookingId}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Service:</span>
                <span className="font-bold text-slate-900">{selectedPackage?.name || "Packers & Movers"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Pickup Address:</span>
                <span className="font-bold text-slate-900 text-right line-clamp-1">{pickup || "Hosur Area"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Drop Address:</span>
                <span className="font-bold text-slate-900 text-right line-clamp-1">{drop || "Destination"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Customer:</span>
                <span className="font-bold text-slate-900">{name || "Valued Customer"} (+91 {phone})</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200">
                <span className="text-slate-500 font-medium">Estimated Base Package:</span>
                <span className="font-extrabold text-emerald-700 text-sm">{selectedPackage?.price || "₹1,499"}</span>
              </div>
            </div>

            <button
              onClick={() => {
                setBookingSuccessOpen(false)
                navigate(routes.landing)
              }}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer"
            >
              Back to Home
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default PackersMoversBookingHosurPage
