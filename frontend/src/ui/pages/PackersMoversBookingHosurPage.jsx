import React, { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import {
  MapPin, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, ArrowRight, ShieldCheck,
  Clock, Package, Boxes, X, Sparkles, Navigation, Truck,
  CheckCircle2, Star, Phone, HelpCircle, Loader2, LocateFixed,
  User, Mail, MessageSquare, AlertCircle, Home, Bike, Check,
  ClipboardList, Settings, Zap, Wrench, Search, Plus, Calendar, AlertTriangle, Ban
} from "lucide-react"
import { routes } from "../routes.js"
import { fetchServiceTiers, fetchLanes, fetchServiceAreas } from "../../api/logisticsService.js"
import { createBooking, cancelBooking, getBookingStatus } from "../../api/bookingService.js"
import { todayDateString } from "../../components/logistics/LogisticsKit.jsx"
import { SupportHelpCenterModal } from "../components/SupportHelpCenterModal.jsx"
import { useAuth } from "../../state/auth/useAuth.js"
import { CustomerAccountModal } from "./BookingPage.jsx"
import { CustomerEntryFlowModal } from "../components/CustomerEntryFlowModal.jsx"
import { BookingCancellationModal } from "../components/BookingCancellationModal.jsx"
import {
  HOSUR_LOCATIONS_DATABASE,
  filterLocationSuggestions as filterHosurLocations,
  searchHosurPlacesOnline,
  formatExactLocation,
  isHosurRouteServed,
} from "../../services/hosurLocations.js"

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

const INTERCITY_CITIES = [
  { name: "Bengaluru", state: "Karnataka", subtitle: "Karnataka (~40 Kms from Hosur)" },
  { name: "Chennai", state: "Tamil Nadu", subtitle: "Tamil Nadu (~310 Kms from Hosur)" },
  { name: "Coimbatore", state: "Tamil Nadu", subtitle: "Tamil Nadu (~310 Kms from Hosur)" },
  { name: "Dharmapuri", state: "Tamil Nadu", subtitle: "Tamil Nadu (~90 Kms from Hosur)" },
  { name: "Madurai", state: "Tamil Nadu", subtitle: "Tamil Nadu (~410 Kms from Hosur)" },
  { name: "Hosur", state: "Tamil Nadu", subtitle: "Tamil Nadu (Origin Hub)" },
  { name: "Salem", state: "Tamil Nadu", subtitle: "Tamil Nadu (~150 Kms from Hosur)" },
  { name: "Krishnagiri", state: "Tamil Nadu", subtitle: "Tamil Nadu (~50 Kms from Hosur)" },
  { name: "Tiruchirappalli (Trichy)", state: "Tamil Nadu", subtitle: "Tamil Nadu (~290 Kms from Hosur)" },
  { name: "Tirupur", state: "Tamil Nadu", subtitle: "Tamil Nadu (~265 Kms from Hosur)" },
  { name: "Erode", state: "Tamil Nadu", subtitle: "Tamil Nadu (~210 Kms from Hosur)" },
  { name: "Vellore", state: "Tamil Nadu", subtitle: "Tamil Nadu (~180 Kms from Hosur)" },
  { name: "Mysore", state: "Karnataka", subtitle: "Karnataka (~185 Kms from Hosur)" },
  { name: "Hyderabad", state: "Telangana", subtitle: "Telangana (~610 Kms from Hosur)" },
  { name: "Kochi", state: "Kerala", subtitle: "Kerala (~500 Kms from Hosur)" },
  { name: "Puducherry", state: "Pondicherry", subtitle: "Pondicherry (~260 Kms from Hosur)" },
]

function filterIntercitySuggestions(searchText, excludeCityName = "") {
  const excludeNormalized = (excludeCityName || "").trim().toLowerCase()
  const availableCities = INTERCITY_CITIES.filter((item) => {
    if (!excludeNormalized) return true
    const itemNorm = item.name.toLowerCase()
    return itemNorm !== excludeNormalized && !excludeNormalized.includes(itemNorm) && !itemNorm.includes(excludeNormalized)
  })

  if (!searchText || !searchText.trim()) {
    return availableCities.slice(0, 8)
  }

  const query = searchText.trim().toLowerCase()
  const exactStarts = []
  const wordStarts = []
  const containsMatches = []

  availableCities.forEach((item) => {
    const nameLow = item.name.toLowerCase()
    const stateLow = (item.state || "").toLowerCase()
    const subLow = (item.subtitle || "").toLowerCase()

    if (nameLow.startsWith(query)) {
      exactStarts.push(item)
    } else if (
      nameLow.split(/[\s,/-]+/).some((w) => w.startsWith(query)) ||
      stateLow.startsWith(query)
    ) {
      wordStarts.push(item)
    } else if (nameLow.includes(query) || stateLow.includes(query) || subLow.includes(query)) {
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
    if (result.length >= 8) break
  }
  return result
}

function filterLocationSuggestions(searchText, city = "HOSUR") {
  return filterHosurLocations(searchText)
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

/* ── Enhanced Custom Shifting Date Picker ── */
function CustomShiftingDatePicker({ value, onChange, placeholder = "Select Shifting Date" }) {
  const [isOpen, setIsOpen] = useState(false)
  const wrapperRef = useRef(null)

  const initialDate = value ? new Date(value + "T00:00:00") : new Date()
  const [viewYear, setViewYear] = useState(isNaN(initialDate.getTime()) ? new Date().getFullYear() : initialDate.getFullYear())
  const [viewMonth, setViewMonth] = useState(isNaN(initialDate.getTime()) ? new Date().getMonth() : initialDate.getMonth())

  useEffect(() => {
    if (value) {
      const d = new Date(value + "T00:00:00")
      if (!isNaN(d.getTime())) {
        setViewYear(d.getFullYear())
        setViewMonth(d.getMonth())
      }
    }
  }, [value])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setIsOpen(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [])

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ]
  const dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const selectedDateObj = value ? new Date(value + "T00:00:00") : null

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay()

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear((prev) => prev - 1)
    } else {
      setViewMonth((prev) => prev - 1)
    }
  }

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear((prev) => prev + 1)
    } else {
      setViewMonth((prev) => prev + 1)
    }
  }

  const formatDateString = (y, m, d) => {
    const mm = String(m + 1).padStart(2, "0")
    const dd = String(d).padStart(2, "0")
    return `${y}-${mm}-${dd}`
  }

  const handleSelectDay = (day) => {
    const formatted = formatDateString(viewYear, viewMonth, day)
    onChange(formatted)
    setIsOpen(false)
  }

  const setQuickDate = (daysFromToday) => {
    const target = new Date()
    target.setDate(target.getDate() + daysFromToday)
    const formatted = formatDateString(target.getFullYear(), target.getMonth(), target.getDate())
    onChange(formatted)
    setViewYear(target.getFullYear())
    setViewMonth(target.getMonth())
    setIsOpen(false)
  }

  const formatDisplay = (val) => {
    if (!val) return ""
    try {
      const d = new Date(val + "T00:00:00")
      if (isNaN(d.getTime())) return val
      return d.toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    } catch {
      return val
    }
  }

  return (
    <div className="relative" ref={wrapperRef}>
      {/* Trigger Input Card */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full h-[54px] px-4 rounded-xl border bg-white flex items-center justify-between cursor-pointer transition-all ${
          isOpen
            ? "border-[#0B8860] ring-2 ring-[#0B8860]/20 shadow-sm"
            : "border-[#E0E0E0] hover:border-slate-400"
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#0B8860] flex items-center justify-center shrink-0">
            <Calendar className="w-4 h-4" />
          </div>
          <span className={`text-[15px] font-medium ${value ? "text-[#333333] font-semibold" : "text-[#999999]"}`}>
            {value ? formatDisplay(value) : placeholder}
          </span>
        </div>
        <div className="text-slate-400">
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>

      {/* Enhanced Calendar Popover (Positioned upwards to ensure 100% full visibility) */}
      {isOpen && (
        <div className="absolute left-0 bottom-full mb-2 w-full sm:w-[320px] bg-white rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.22)] border border-slate-200/90 p-4 z-[100] animate-in fade-in zoom-in-95 duration-150">
          {/* Quick Selection Shortcuts */}
          <div className="flex items-center gap-1.5 pb-3 mb-3 border-b border-slate-100 overflow-x-auto">
            <button
              type="button"
              onClick={() => setQuickDate(0)}
              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 hover:bg-emerald-100 hover:text-emerald-800 text-slate-700 transition-colors cursor-pointer shrink-0"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setQuickDate(1)}
              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 hover:bg-emerald-100 hover:text-emerald-800 text-slate-700 transition-colors cursor-pointer shrink-0"
            >
              Tomorrow
            </button>
            <button
              type="button"
              onClick={() => {
                const now = new Date()
                const distToSat = (6 - now.getDay() + 7) % 7 || 7
                setQuickDate(distToSat)
              }}
              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 hover:bg-emerald-100 hover:text-emerald-800 text-slate-700 transition-colors cursor-pointer shrink-0"
            >
              Weekend
            </button>
            <button
              type="button"
              onClick={() => setQuickDate(7)}
              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 hover:bg-emerald-100 hover:text-emerald-800 text-slate-700 transition-colors cursor-pointer shrink-0"
            >
              +1 Week
            </button>
          </div>

          {/* Month & Year Navigation */}
          <div className="flex items-center justify-between mb-3 px-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h4 className="text-sm font-extrabold text-slate-900">
              {monthNames[viewMonth]} {viewYear}
            </h4>
            <button
              type="button"
              onClick={handleNextMonth}
              className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Day Names Header */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {dayNames.map((d, i) => (
              <span key={i} className="text-[11px] font-bold text-slate-400 py-1">
                {d}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <div key={`empty-${i}`} className="w-8 h-8" />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const dateForDay = new Date(viewYear, viewMonth, day)
              dateForDay.setHours(0, 0, 0, 0)
              const isPast = dateForDay < today
              const isSelected =
                selectedDateObj &&
                selectedDateObj.getFullYear() === viewYear &&
                selectedDateObj.getMonth() === viewMonth &&
                selectedDateObj.getDate() === day
              const isToday = dateForDay.getTime() === today.getTime()

              return (
                <button
                  key={day}
                  type="button"
                  disabled={isPast}
                  onClick={() => handleSelectDay(day)}
                  className={`w-8 h-8 mx-auto text-xs rounded-xl flex items-center justify-center font-bold transition-all ${
                    isPast
                      ? "text-slate-300 cursor-not-allowed"
                      : isSelected
                      ? "bg-[#0B8860] text-white shadow-md shadow-emerald-700/25 scale-105 cursor-pointer font-extrabold"
                      : isToday
                      ? "border border-[#0B8860] text-[#0B8860] hover:bg-emerald-50 cursor-pointer"
                      : "text-slate-700 hover:bg-slate-100 cursor-pointer"
                  }`}
                >
                  {day}
                </button>
              )
            })}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 text-xs">
            <button
              type="button"
              onClick={() => {
                onChange("")
                setIsOpen(false)
              }}
              className="text-slate-500 hover:text-slate-800 font-bold hover:underline cursor-pointer"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => setQuickDate(0)}
              className="text-[#0B8860] font-bold hover:underline cursor-pointer"
            >
              Select Today
            </button>
          </div>
        </div>
      )}
    </div>
  )
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
  const [bookingSuccessOpen, setBookingSuccessOpen] = useState(false)
  const [supportModalOpen, setSupportModalOpen] = useState(false)
  const [noServiceRoute, setNoServiceRoute] = useState(false)
  const { user } = useAuth()
  const [showAccountPortal, setShowAccountPortal] = useState(false)
  const [showCustomerEntryModal, setShowCustomerEntryModal] = useState(false)
  const [localIsSignedIn, setLocalIsSignedIn] = useState(false)
  const isSignedIn = Boolean(user) || localIsSignedIn

  // Live Dispatch & Polling State
  const [lookingForPartnerOpen, setLookingForPartnerOpen] = useState(false)
  const [partnerCountdown, setPartnerCountdown] = useState(120)
  const [orderDetailsExpanded, setOrderDetailsExpanded] = useState(false)
  const [cancelModalOpen, setCancelModalOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState("")
  const [cancelComments, setCancelComments] = useState("")
  const [cancelSubmitting, setCancelSubmitting] = useState(false)
  const [cancelledBookingModalOpen, setCancelledBookingModalOpen] = useState(false)
  const [cancelledReasonText, setCancelledReasonText] = useState("")
  const [bookingError, setBookingError] = useState("")
  const [bookingSubmitting, setBookingSubmitting] = useState(false)
  const [lastBookingId, setLastBookingId] = useState(null)
  const [lastTrackingToken, setLastTrackingToken] = useState(null)
  const [showExitConfirm, setShowExitConfirm] = useState(false)

  const formatCountdown = (sec) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
  }

  // Countdown timer for partner search screen
  useEffect(() => {
    let t = null
    if (lookingForPartnerOpen) {
      setPartnerCountdown(120)
      t = setInterval(() => {
        setPartnerCountdown((prev) => (prev > 0 ? prev - 1 : 0))
      }, 1000)
    }
    return () => {
      if (t) clearInterval(t)
    }
  }, [lookingForPartnerOpen])

  // Lock body scroll when modal open
  useEffect(() => {
    if (
      lookingForPartnerOpen ||
      cancelModalOpen ||
      cancelledBookingModalOpen ||
      inventoryBuilderOpen ||
      supportModalOpen
    ) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }
    return () => {
      document.body.style.overflow = "unset"
    }
  }, [
    lookingForPartnerOpen,
    cancelModalOpen,
    cancelledBookingModalOpen,
    inventoryBuilderOpen,
    supportModalOpen,
  ])

  // Real-time Booking Status Polling
  useEffect(() => {
    if (!lookingForPartnerOpen || !lastBookingId) return

    let pollInterval = null
    let isMounted = true

    const checkStatus = async () => {
      try {
        const res = await getBookingStatus(lastBookingId, lastTrackingToken || "")
        if (res?.data && isMounted) {
          const status = (res.data.status || "").toLowerCase()
          const isAccepted = Boolean(
            res.data.is_accepted ||
            ["accepted", "on_the_way", "arrived", "in_progress"].includes(status)
          )
          if (isAccepted) {
            setLookingForPartnerOpen(false)
            const bookingPayload = {
              id: lastBookingId,
              request_id: lastBookingId,
              tracking_token: lastTrackingToken,
              ...(res?.data || {})
            }
            try {
              sessionStorage.setItem("calservice_active_tracking_id", lastBookingId)
              sessionStorage.setItem("calservice_last_booking", JSON.stringify(bookingPayload))
            } catch (e) {}
            navigate(`${routes.booking_checkout}?track=${encodeURIComponent(lastBookingId)}`, {
              state: {
                isTracking: true,
                successData: bookingPayload
              }
            })
          }
        }
      } catch (e) {
        console.warn("Failed to poll booking status:", e)
      }
    }

    checkStatus()
    pollInterval = setInterval(checkStatus, 4000)

    return () => {
      isMounted = false
      if (pollInterval) clearInterval(pollInterval)
    }
  }, [lookingForPartnerOpen, lastBookingId, lastTrackingToken, navigate])

  // Handle browser back button during partner search
  useEffect(() => {
    if (!lookingForPartnerOpen) return

    window.history.pushState(null, null, window.location.pathname)

    const handlePopState = (e) => {
      e.preventDefault()
      window.history.pushState(null, null, window.location.pathname)
      setShowExitConfirm(true)
    }

    window.addEventListener("popstate", handlePopState)
    return () => {
      window.removeEventListener("popstate", handlePopState)
    }
  }, [lookingForPartnerOpen])

  // Prefill user details if signed in
  useEffect(() => {
    let savedPhone = ""
    try { savedPhone = localStorage.getItem("caltrack_customer_phone") || "" } catch (_) {}
    if (user || savedPhone) {
      const fullName = user?.full_name || user?.fullName || user?.first_name || user?.firstName || user?.username
      if (fullName && !name) setName(fullName)
      const ph = user?.phone || user?.mobile || user?.mobile_number || savedPhone
      if (ph && !phone) setPhone(ph)
    }
  }, [user])

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

  // Lock body scroll when Know More modal is open
  useEffect(() => {
    document.body.style.overflow = activePackageDetails ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [activePackageDetails])

  // FAQ state
  const [openFaq, setOpenFaq] = useState(null)

  // Catalog data — fetched from /api/logistics/ (backend/logistics app),
  // replacing what used to be hardcoded PACKERS_PACKAGES/POPULAR_ROUTES/
  // HOSUR_AREAS arrays.
  const [fetchedTiers, setFetchedTiers] = useState([])
  const [fetchedLanes, setFetchedLanes] = useState([])
  const [serviceAreas, setServiceAreas] = useState([])

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
    if (inventoryBuilderOpen || vehicleSelectorOpen || showCustomerEntryModal || bookingSuccessOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }
    return () => {
      document.body.style.overflow = "unset"
    }
  }, [inventoryBuilderOpen, vehicleSelectorOpen, showCustomerEntryModal, bookingSuccessOpen])

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

  const [onlineDropSuggestions, setOnlineDropSuggestions] = useState([])

  useEffect(() => {
    if (!drop || drop.trim().length < 2 || relocationType === "Between Cities") {
      setOnlineDropSuggestions([])
      return
    }
    const timer = setTimeout(async () => {
      const res = await searchHosurPlacesOnline(drop)
      setOnlineDropSuggestions(res || [])
    }, 250)
    return () => clearTimeout(timer)
  }, [drop, relocationType])

  const rawPickupSuggestions = relocationType === "Between Cities"
    ? filterIntercitySuggestions(pickup, drop)
    : filterLocationSuggestions(pickup, selectedCity)
  const pickupSuggestions = rawPickupSuggestions

  const rawDropSuggestions = relocationType === "Between Cities"
    ? filterIntercitySuggestions(drop, pickup)
    : filterLocationSuggestions(drop, selectedCity)
  const dropSuggestions = [
    ...rawDropSuggestions,
    ...onlineDropSuggestions.filter(
      (on) => !rawDropSuggestions.some((loc) => loc.name?.toLowerCase() === on.name?.toLowerCase())
    ),
  ]

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
        alert("GPS location unavailable. Please enter your pickup address manually.")
      },
      { timeout: 10000, enableHighAccuracy: true }
    )
  }

  const PACKERS_SUITABILITY_MAP = {
    "1-rk-1-bhk-shifting": [
      "1 RK / 1 BHK Full Household",
      "Furniture disassembly & assembly",
      "Bubble wrap & carton packing",
      "Loading & unloading by verified crew",
      "Dedicated transport vehicle"
    ],
    "2-bhk-3-bhk-shifting": [
      "2 BHK / 3 BHK Large Household",
      "Heavy furniture & appliance packing",
      "Multi-layer bubble & foam protection",
      "Professional 4-6 member crew",
      "Large closed container truck"
    ],
    "villa-office-relocation": [
      "Villas, Bungalows & Corporate Offices",
      "IT hardware & server safe packing",
      "Customized crating & insurance support",
      "Dedicated relocation manager",
      "End-to-end unpacking & setup"
    ]
  }

  function isBadgeActive(durationStr, updatedAtStr) {
    if (!durationStr || !updatedAtStr) return true
    const norm = durationStr.toLowerCase().trim()
    let durationMs = 0
    if (norm.includes("day")) {
      const num = parseInt(norm) || 0
      durationMs = num * 24 * 60 * 60 * 1000
    } else if (norm.includes("month")) {
      const num = parseInt(norm) || 0
      durationMs = num * 30 * 24 * 60 * 60 * 1000
    } else if (norm.includes("yr") || norm.includes("year")) {
      const num = parseInt(norm) || 0
      durationMs = num * 365 * 24 * 60 * 60 * 1000
    } else if (norm.includes("min")) {
      const num = parseInt(norm) || 0
      durationMs = num * 60 * 1000
    } else {
      return true
    }
    const updatedTime = new Date(updatedAtStr).getTime()
    return (Date.now() - updatedTime) <= durationMs
  }

  // Adapt backend ServiceTier rows to the { id, name, capacity, price,
  // diagram, details } shape the rest of this page already renders.
  function tierToPackage(tier) {
    const isBadgeValid = isBadgeActive(tier.duration, tier.updated_at)
    const badgeText = isBadgeValid ? (tier.icon || "") : ""
    const suitableList = (Array.isArray(tier.includes) && tier.includes.length > 0)
      ? tier.includes
      : (PACKERS_SUITABILITY_MAP[tier.slug] || [])

    return {
      id: tier.slug,
      name: tier.name,
      capacity: tier.capacity_label,
      description: tier.description,
      badge: badgeText,
      suitableFor: suitableList,
      price: `₹${Number(tier.starting_price).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`,
      diagram: PACKERS_DIAGRAM_BY_SLUG[tier.slug] || <OneBhkDiagram />,
      details: {
        name: tier.name,
        capacity: tier.description || "Complete shifting package with professional crew",
        crew: "Professional packing crew + dedicated vehicle",
        materials: "Bubble wrap, corrugated boxes, stretch film & tape included",
        baseFare: `₹${Number(tier.starting_price).toLocaleString("en-IN", { maximumFractionDigits: 0 })} (Includes packing, loading & transport)`,
        suitableFor: suitableList,
      },
      _tierId: tier.id,
    }
  }

  const PACKERS_PACKAGES = fetchedTiers.map(tierToPackage)

  const HOSUR_AREAS = serviceAreas.map((a) => a.name)

  const POPULAR_ROUTES = fetchedLanes.map((lane) => ({
    to: lane.destination_label,
    distance: lane.distance_km ? `${Number(lane.distance_km)} km` : "",
    fare: `₹${Number(lane.fare).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`,
    time: lane.eta_label,
    _laneId: lane.id,
  }))

  // FAQs
  const FAQS = [
    {
      q: "What packing materials are included with Sevo Packers and Movers?",
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
    if (relocationType === "Between Cities" && pickup && drop && pickup.trim().toLowerCase() === drop.trim().toLowerCase()) {
      alert("Source and Destination cities cannot be the same for Between Cities relocation. Please choose different cities.")
      return
    }
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
      const pkg = selectedPackage || PACKERS_PACKAGES[0]
      const fare = Number(String(pkg.price).replace(/[^0-9.]/g, "")) || 455
      
      let dateString = todayDateString()
      if (selectedDate && selectedDate.fullDate) {
        const d = selectedDate.fullDate
        dateString = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      }

      const customerEmail = user?.email || (typeof window !== "undefined" ? localStorage.getItem("caltrack_customer_email") : "") || ""
      const payload = {
        customer_name: name || "Thejaa T",
        phone: phone || "6379222691",
        email: customerEmail,
        service_category: "packers_movers",
        issue_title: `Packers & Movers — ${pkg.name || "House Shifting"} (${relocationType})`,
        description: `Type: ${userType} | Relocation: ${relocationType}`,
        address: pickup || "Hosur, Tamil Nadu",
        drop_address: drop || "Bengaluru, Karnataka, India",
        latitude: 12.7409,
        longitude: 77.8253,
        preferred_date: dateString,
        preferred_time: selectedSlot || "Morning",
        total_amount: fare,
        payment_method: "COD",
        cart_data: [{
          package: pkg.name || "Packers & Movers", price: pkg.price || `₹ ${fare}`, route: selectedRoute?.to || null,
          relocation_type: relocationType, inventory: inventoryItems,
          date: selectedDate?.value, slot: selectedSlot
        }],
      }
      if (pkg?._tierId) payload.logistics_tier = pkg._tierId
      if (selectedRoute?._laneId) payload.logistics_lane = selectedRoute._laneId

      const res = await createBooking(payload)
      const bookingId = res?.data?.request_id || res?.request_id || ("CRN" + Math.floor(100000000000 + Math.random() * 900000000000))
      const token = res?.data?.tracking_token || res?.tracking_token || null
      setLastBookingId(bookingId)
      setLastTrackingToken(token)
      setInventoryBuilderOpen(false)
      setVehicleSelectorOpen(false)
      setLookingForPartnerOpen(true)
    } catch (err) {
      console.warn("Booking creation fallback:", err)
      const fallbackCRN = "CRN" + Math.floor(100000000000 + Math.random() * 900000000000)
      setLastBookingId(fallbackCRN)
      setLastTrackingToken(null)
      setInventoryBuilderOpen(false)
      setVehicleSelectorOpen(false)
      setLookingForPartnerOpen(true)
    } finally {
      setBookingSubmitting(false)
    }
  }

  const handleConfirmCancelTrip = async () => {
    if (!cancelReason) return
    setCancelSubmitting(true)
    try {
      if (lastBookingId) {
        await cancelBooking(lastBookingId, `${cancelReason}${cancelComments ? `: ${cancelComments}` : ''}`)
      }
    } catch (err) {
      console.warn("Error cancelling booking on server:", err)
    } finally {
      setCancelSubmitting(false)
      setCancelModalOpen(false)
      setLookingForPartnerOpen(false)
    }
  }

  const handleBookNow = () => {
    if (!isSignedIn) {
      setShowCustomerEntryModal(true)
    } else {
      submitBooking()
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
                Sevo
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
            <span className="hover:text-emerald-600 cursor-pointer" onClick={() => setSupportModalOpen(true)}>Support</span>
            {user ? (
              <button
                type="button"
                onClick={() => setShowAccountPortal(true)}
                className="flex items-center gap-2 text-slate-800 hover:text-slate-950 font-medium text-sm transition-colors cursor-pointer group"
              >
                <div className="w-7 h-7 rounded-full border border-slate-400 text-slate-700 flex items-center justify-center shrink-0 group-hover:border-slate-700 transition-colors">
                  <User className="w-4 h-4 stroke-[1.75]" />
                </div>
                <span className="font-semibold text-slate-800">
                  {user?.full_name || user?.fullName || user?.first_name || user?.firstName || user?.username || "Customer"}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-600 stroke-[2] shrink-0 group-hover:text-slate-900 transition-colors" />
              </button>
            ) : (
              <button
                onClick={() => setShowCustomerEntryModal(true)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Hero Section (Vertical Form Style) ────────────────────── */}
      <section 
        className="relative pt-10 pb-12 sm:pt-16 sm:pb-20 overflow-visible border-b border-slate-200/50 bg-cover bg-center bg-no-repeat"
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
          <div className="w-full max-w-[440px] shrink-0 mt-4 md:mt-0 relative z-20 font-sans antialiased">
            <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.08)] overflow-visible flex flex-col border border-slate-100 relative">
              
              {/* Top Area (Soft Emerald) */}
              <div className="bg-[#ecfdf5] pt-8 pb-6 px-6 relative rounded-t-2xl">
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
              <div className="px-6 py-6 bg-white flex-1 z-10 rounded-b-2xl overflow-visible">
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
                                  placeholder="Enter pickup address or landmark..."
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
                                  placeholder="Enter drop address or landmark..."
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
                                            const exact = formatExactLocation(loc)
                                            setDrop(exact)
                                            setShowDropSuggestions(false)
                                          }}
                                          className="w-full text-left px-4 py-3 hover:bg-slate-50 text-[14px] font-medium text-[#484848] transition-colors cursor-pointer"
                                        >
                                          <div className="font-semibold">{loc.name}</div>
                                          {loc.subtitle && <div className="text-xs text-slate-400">{loc.subtitle}</div>}
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
                                  <div className="absolute top-full left-0 mt-1 w-full bg-white rounded-xl shadow-xl border border-slate-200 z-50 max-h-52 overflow-y-auto divide-y divide-slate-100">
                                    {pickupSuggestions.map((loc, idx) => (
                                      <button
                                        key={idx}
                                        type="button"
                                        onMouseDown={(e) => {
                                          e.preventDefault()
                                          setPickup(loc.name)
                                          if (relocationType === "Between Cities" && drop && drop.trim().toLowerCase() === loc.name.toLowerCase()) {
                                            setDrop("")
                                          }
                                          setShowPickupSuggestions(false)
                                        }}
                                        className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-[14px] font-medium text-[#484848] transition-colors cursor-pointer flex items-center justify-between"
                                      >
                                        <div>
                                          <div className="font-bold text-slate-800">{loc.name}</div>
                                          {loc.subtitle && <div className="text-[11px] text-slate-400 font-normal">{loc.subtitle}</div>}
                                        </div>
                                        {loc.state && <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700">{loc.state}</span>}
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
                                  <div className="absolute top-full left-0 mt-1 w-full bg-white rounded-xl shadow-xl border border-slate-200 z-50 max-h-52 overflow-y-auto divide-y divide-slate-100">
                                    {dropSuggestions.map((loc, idx) => (
                                      <button
                                        key={idx}
                                        type="button"
                                        onMouseDown={(e) => {
                                          e.preventDefault()
                                          setDrop(loc.name)
                                          if (relocationType === "Between Cities" && pickup && pickup.trim().toLowerCase() === loc.name.toLowerCase()) {
                                            setPickup("")
                                          }
                                          setShowDropSuggestions(false)
                                        }}
                                        className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-[14px] font-medium text-[#484848] transition-colors cursor-pointer flex items-center justify-between"
                                      >
                                        <div>
                                          <div className="font-bold text-slate-800">{loc.name}</div>
                                          {loc.subtitle && <div className="text-[11px] text-slate-400 font-normal">{loc.subtitle}</div>}
                                        </div>
                                        {loc.state && <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700">{loc.state}</span>}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[13px] font-semibold text-[#484848] mb-3">Select Shifting Date</label>
                            <CustomShiftingDatePicker
                              value={shiftingDateBetween}
                              onChange={setShiftingDateBetween}
                              placeholder="Select Shifting Date"
                            />
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

        {/* Dynamic active packages based on category status */}
        {PACKERS_PACKAGES.length === 0 ? (
          <div className="max-w-md mx-auto mt-8 p-6 bg-slate-50 border border-slate-200 rounded-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-3">
              <Boxes className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-800 text-base">Relocation Packages Unavailable</h3>
            <p className="text-xs text-slate-500 mt-1">
              Packers and movers packages in this area are currently inactive or undergoing maintenance. Please check back shortly.
            </p>
          </div>
        ) : (
          <div className={`grid ${PACKERS_PACKAGES.length === 1 ? 'grid-cols-1 max-w-md' : PACKERS_PACKAGES.length === 2 ? 'grid-cols-1 sm:grid-cols-2 max-w-2xl' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl'} gap-6 mx-auto mt-8 items-stretch`}>
            {PACKERS_PACKAGES.map((pkg) => (
              <div
                key={pkg.id}
                className="bg-white rounded-xl border border-slate-200/90 p-6 flex flex-col items-center text-center shadow-none hover:border-slate-300 transition-all justify-between relative"
              >
                {/* Highlight Badge if configured */}
                {pkg.badge && (
                  <span
                    className={`absolute top-3.5 right-3.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border shadow-2xs ${
                      pkg.badge.toLowerCase().includes("popular")
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : pkg.badge.toLowerCase().includes("rare")
                        ? "bg-slate-100 text-slate-700 border-slate-200"
                        : "bg-blue-50 text-blue-700 border-blue-200"
                    }`}
                  >
                    ★ {pkg.badge}
                  </span>
                )}

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
                    className="text-xs sm:text-sm font-bold text-emerald-700 hover:text-emerald-800 border-b border-dotted border-emerald-600 hover:border-emerald-700 cursor-pointer pb-0.5 inline-block focus:outline-none"
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
        )}
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

          <div className="bg-[#F0FDF4]/70 border border-emerald-100 rounded-3xl p-5 sm:p-8">
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
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full">
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

      {/* ── Section: Think Logistics, Think Sevo! (App Banner) ── */}
      <section className="py-12 bg-emerald-900 text-white relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="text-center md:text-left max-w-lg">
            <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
              Mobile App Experience
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1">
              Think Logistics, Think Sevo!
            </h2>
            <p className="text-sm text-emerald-100 mt-2">
              Get the Sevo mobile app to manage your household shifting, track container trucks in real time, and download invoices easily.
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
          How Sevo Packers and Movers Works?
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

      {/* ── Section: Sevo vs Local Vendors ── */}
      <section className="py-12 bg-white border-y border-slate-200/70">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight text-center mb-8">
            Sevo compared to local vendors
          </h2>
          <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50">
                  <th className="p-4 font-bold text-slate-700 border-b border-slate-200">Services</th>
                  <th className="p-4 font-bold text-emerald-700 border-b border-l border-slate-200 text-center bg-emerald-50/50">Sevo</th>
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
          <div className="bg-white rounded-2xl p-6 text-center hover:shadow-md hover:border-indigo-300 transition-all border border-slate-200/80">
            <div className="w-12 h-12 mx-auto bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center mb-3 shadow-xs">
              <Package className="w-6 h-6 text-indigo-500" />
            </div>
            <h3 className="font-bold text-slate-900 mb-1">Rope Pulling Services</h3>
            <p className="text-xs text-slate-500">Assistance from experts in handling heavy goods that need extra care</p>
          </div>
          
          <div className="bg-white rounded-2xl p-6 text-center hover:shadow-md hover:border-rose-300 transition-all border border-slate-200/80">
            <div className="w-12 h-12 mx-auto bg-rose-50 border border-rose-100 rounded-2xl flex items-center justify-center mb-3 shadow-xs">
              <Settings className="w-6 h-6 text-rose-500" />
            </div>
            <h3 className="font-bold text-slate-900 mb-1">Appliance Installation</h3>
            <p className="text-xs text-slate-500">Un-installation and installation of electrical appliances by professionals</p>
          </div>
          
          <div className="bg-white rounded-2xl p-6 text-center hover:shadow-md hover:border-amber-300 transition-all border border-slate-200/80">
            <div className="w-12 h-12 mx-auto bg-amber-50 border border-amber-100 rounded-2xl flex items-center justify-center mb-3 shadow-xs">
              <Zap className="w-6 h-6 text-amber-500" />
            </div>
            <h3 className="font-bold text-slate-900 mb-1">Professional Electrician</h3>
            <p className="text-xs text-slate-500">Expertise at your rescue for complex wiring and setups</p>
          </div>
          
          <div className="bg-white rounded-2xl p-6 text-center hover:shadow-md hover:border-emerald-300 transition-all border border-slate-200/80">
            <div className="w-12 h-12 mx-auto bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-center mb-3 shadow-xs">
              <Wrench className="w-6 h-6 text-emerald-500" />
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
              Shift your home or corporate office stress-free with Sevo! Our certified packing professionals use premium materials to pack every fragile item, manage heavy lifting, and transport your possessions safely across Hosur, SIPCOT industrial zones, and intercity destinations.
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
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-extrabold text-slate-900">{activePackageDetails.name || activePackageDetails.details?.name}</h3>
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

            {/* Checkbox Ticked Inclusions Checklist */}
            <div className="mt-4">
              <span className="font-bold text-slate-900 block mb-3 text-sm">Suitable for / Inclusions:</span>
              <ul className="space-y-2.5">
                {(activePackageDetails.suitableFor || activePackageDetails.details?.suitableFor || []).map((item, idx) => (
                  <li key={idx} className="flex items-start text-xs sm:text-sm text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mr-2 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Description / Summary if set */}
            {activePackageDetails.description && (
              <div className="mt-4 bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs text-slate-600">
                <span className="font-bold text-slate-800">Package Details: </span>
                <span>{activePackageDetails.description}</span>
              </div>
            )}

            {/* Base Fare */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Estimated Base Rate:</span>
              <span className="text-base font-extrabold text-emerald-700">{activePackageDetails.price}</span>
            </div>

            <button
              onClick={() => {
                setSelectedPackage(activePackageDetails)
                setActivePackageDetails(null)
                handleGetEstimate()
              }}
              className="w-full mt-5 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer"
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
                          handleBookNow()
                        }}
                        disabled={bookingSubmitting}
                        className="px-10 py-3.5 bg-[#0B8860] hover:bg-[#097754] text-white text-[15px] font-bold rounded-xl transition-all shadow-md shadow-[#0B8860]/20 cursor-pointer disabled:opacity-60"
                      >
                        {bookingSubmitting ? "Confirming..." : "Confirm Booking"}
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

      {/* ── Looking for partner... Screen (Green Logistics Branding) ─────────────── */}
      {lookingForPartnerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[90] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-100 relative overflow-hidden flex flex-col md:flex-row min-h-[480px]">
            {/* Left Column: Looking for partner status & Order Details */}
            <div className="flex-1 p-6 md:p-8 flex flex-col justify-between">
              <div>
                {/* Pulsing radar icon */}
                <div className="w-20 h-20 rounded-full bg-emerald-50 border-4 border-emerald-100 flex items-center justify-center mx-auto mb-4 relative">
                  <div className="absolute inset-0 rounded-full bg-emerald-400/20 animate-ping" />
                  <div className="w-12 h-12 rounded-full bg-emerald-600 flex items-center justify-center text-white shadow-md relative z-10">
                    <MapPin className="w-6 h-6 text-white" />
                  </div>
                </div>

                <div className="text-center mb-6">
                  <h3 className="text-2xl font-black text-slate-900 mb-1">Looking for partner...</h3>
                  <p className="text-xs text-slate-500 font-medium">
                    We expect to find a partner within <span className="font-bold text-emerald-800">{formatCountdown(partnerCountdown)} mins</span>
                  </p>
                </div>

                {/* Order Details Accordion */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden mb-4 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setOrderDetailsExpanded(!orderDetailsExpanded)}
                    className="w-full p-3.5 bg-slate-50/70 hover:bg-slate-50 flex items-center justify-between text-left cursor-pointer transition-colors"
                  >
                    <div>
                      <p className="text-xs font-extrabold text-slate-900">Order Details</p>
                      <p className="text-[11px] text-slate-500 font-bold mt-0.5">{lastBookingId || "CRN288650604065"}</p>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${orderDetailsExpanded ? "rotate-180" : ""}`} />
                  </button>

                  {orderDetailsExpanded && (
                    <div className="p-4 bg-white border-t border-slate-100 space-y-3">
                      {/* Pickup */}
                      <div className="flex items-start gap-3">
                        <div className="mt-1 w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800">{name || "Thejaa T"} • {phone || "6379222691"}</p>
                          <p className="text-xs text-slate-500 leading-snug mt-0.5">{pickup || "Hosur, Tamil Nadu"}</p>
                        </div>
                      </div>
                      <div className="ml-[4px] w-[2px] h-3 bg-slate-300 border-l-2 border-dashed border-slate-400" />
                      {/* Drop */}
                      <div className="flex items-start gap-3">
                        <div className="mt-1 w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800">{name || "Thejaa T"} • {phone || "6379222691"}</p>
                          <p className="text-xs text-slate-500 leading-snug mt-0.5">{drop || (selectedRoute ? selectedRoute.to : "Bengaluru, Karnataka, India")}</p>
                        </div>
                      </div>
                      {/* Service / Relocation Type */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-slate-500">Service</span>
                        <span className="font-bold text-emerald-800">{selectedPackage?.name || "Packers & Movers"} ({relocationType})</span>
                      </div>
                      {/* Amount */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                          <span className="text-base">💵</span> Token Amount
                        </div>
                        <span className="text-sm font-extrabold text-slate-900">
                          ₹ 455
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Cancel Button */}
              <button
                type="button"
                onClick={() => {
                  setCancelReason("")
                  setCancelComments("")
                  setCancelModalOpen(true)
                }}
                className="w-full py-3 rounded-xl border border-emerald-600 text-emerald-700 hover:bg-emerald-50 font-bold text-sm transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>

            {/* Right Column: Supercharge Your Logistics Banner (Green Theme) */}
            <div className="md:w-[45%] bg-gradient-to-br from-[#065F46] to-[#043E2E] text-white p-6 md:p-8 flex flex-col justify-between relative overflow-hidden">
              <div className="flex items-start justify-between mb-5">
                <div>
                  <h4 className="text-2xl font-black leading-tight tracking-tight">Supercharge Your<br />Relocation!</h4>
                </div>
                <div className="bg-emerald-950/60 border border-emerald-400/40 rounded-xl px-2.5 py-1 text-right">
                  <p className="text-[10px] font-bold tracking-wider uppercase opacity-90">SEVO</p>
                  <p className="text-xs font-black text-amber-300">4.8 ★</p>
                </div>
              </div>

              <div className="space-y-3.5 my-3 text-xs font-semibold text-emerald-100">
                <div className="flex items-center gap-2.5">
                  <MapPin className="w-4 h-4 text-emerald-300 shrink-0" />
                  <span>Verified Professional Movers</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-4 h-4 text-yellow-300 shrink-0" />
                  <span>Free Multi-Layer Packing</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Zap className="w-4 h-4 text-emerald-300 shrink-0" />
                  <span>1-Tap Live Tracking</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Truck className="w-4 h-4 text-emerald-300 shrink-0" />
                  <span>Complete Loading &amp; Unloading</span>
                </div>
              </div>

              <div className="pt-5 mt-auto text-center border-t border-emerald-800/80">
                <p className="text-xs font-bold text-white mb-2.5">Scan the QR code to download the app!</p>
                <div className="bg-white p-2.5 rounded-2xl w-28 h-28 mx-auto flex items-center justify-center shadow-lg">
                  {/* Generated QR Code SVG */}
                  <svg className="w-full h-full text-slate-900" viewBox="0 0 100 100" fill="currentColor">
                    <path d="M0,0 h30 v30 h-30 z M5,5 v20 h20 v-20 z M10,10 h10 v10 h-10 z" />
                    <path d="M70,0 h30 v30 h-30 z M75,5 v20 h20 v-20 z M80,10 h10 v10 h-10 z" />
                    <path d="M0,70 h30 v30 h-30 z M5,75 v20 h20 v-20 z M10,80 h10 v10 h-10 z" />
                    <path d="M35,5 h5 v5 h-5 z M45,5 h10 v5 h-10 z M60,5 h5 v10 h-5 z M35,15 h10 v5 h-10 z M50,15 h5 v5 h-5 z M35,25 h5 v5 h-5 z M45,25 h5 v5 h-5 z M55,25 h10 v5 h-10 z" />
                    <path d="M5,35 h5 v10 h-5 z M15,35 h10 v5 h-10 z M15,45 h5 v5 h-5 z M5,50 h10 v5 h-10 z M20,50 h10 v5 h-10 z M25,40 h5 v5 h-5 z M5,60 h5 v5 h-5 z M15,60 h10 v5 h-10 z" />
                    <path d="M35,35 h30 v5 h-30 z M40,45 h15 v5 h-15 z M60,45 h5 v5 h-5 z M35,55 h10 v10 h-10 z M50,55 h15 v5 h-15 z M50,65 h5 v10 h-5 z M60,65 h10 v15 h-10 z" />
                    <path d="M75,35 h15 v5 h-15 z M75,45 h10 v5 h-10 z M90,45 h5 v10 h-5 z M75,55 h5 v5 h-5 z M85,55 h10 v10 h-10 z" />
                    <path d="M35,75 h5 v10 h-5 z M45,75 h10 v5 h-10 z M45,85 h5 v10 h-5 z M55,85 h5 v5 h-5 z M35,90 h5 v5 h-5 z M55,95 h10 v5 h-10 z M75,75 h10 v5 h-10 z M90,75 h5 v15 h-5 z M75,85 h5 v10 h-5 z M85,90 h10 v5 h-10 z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Cancel Trip Modal ── */}
      {cancelModalOpen && (
        <BookingCancellationModal
          bookingId={lastBookingId}
          requestId={lastBookingId}
          isAccepted={false}
          onClose={() => setCancelModalOpen(false)}
          onCancelled={(data) => {
            const reason = data?.cancellation_reason || data?.reason || "Customer requested cancellation"
            setCancelledReasonText(reason)
            setCancelModalOpen(false)
            setLookingForPartnerOpen(false)
            setCancelledBookingModalOpen(true)
          }}
        />
      )}

      {/* ── Booking Cancelled Screen / Modal ── */}
      {cancelledBookingModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setCancelledBookingModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 p-6 sm:p-8 text-center relative animate-in fade-in zoom-in-95 duration-150"
          >
            <button
              type="button"
              onClick={() => setCancelledBookingModalOpen(false)}
              className="absolute right-5 top-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Red Prohibition Icon Badge */}
            <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4 shadow-sm shadow-red-200/50">
              <Ban className="w-8 h-8" />
            </div>

            {/* Header */}
            <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-1">
              Booking Cancelled
            </h2>
            <p className="text-sm text-slate-500 font-medium mb-6">
              Your booking <strong className="text-slate-900 font-extrabold">#{lastBookingId || "GT0586"}</strong> has been cancelled.
            </p>

            {/* Cancellation Details Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 text-left shadow-xs mb-6">
              <div className="text-[11px] font-black text-slate-400 tracking-wider uppercase mb-2.5">
                Cancellation Details
              </div>

              {/* Reason for cancellation box */}
              <div className="bg-red-50 border border-red-200/80 rounded-xl p-3.5 mb-3">
                <div className="text-[10px] font-extrabold text-red-700 tracking-wider uppercase">
                  Reason for Cancellation
                </div>
                <div className="text-sm font-bold text-red-950 mt-0.5">
                  {cancelledReasonText || "Customer requested cancellation"}
                </div>
              </div>

              {/* Refund Info Note */}
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs text-slate-600 leading-relaxed">
                💡 If any advance payment was deducted, your full refund will be credited back within 2-4 business days.
              </div>
            </div>

            {/* Close / Action Button */}
            <button
              type="button"
              onClick={() => setCancelledBookingModalOpen(false)}
              className="w-full py-3.5 px-5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-sm shadow-md transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Exit Confirmation Modal */}
      {showExitConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 text-center animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-amber-50 border-2 border-amber-100 flex items-center justify-center mx-auto mb-4 text-amber-600">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-2">Do you want to exit?</h3>
            <p className="text-xs text-slate-500 font-medium leading-relaxed mb-6">
              Exiting will close the partner search screen. Your booking request will remain active in your bookings.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowExitConfirm(false)
                  setLookingForPartnerOpen(false)
                  const bookingPayload = {
                    id: lastBookingId,
                    request_id: lastBookingId,
                    tracking_token: lastTrackingToken
                  }
                  try {
                    sessionStorage.setItem("calservice_active_tracking_id", lastBookingId)
                    sessionStorage.setItem("calservice_last_booking", JSON.stringify(bookingPayload))
                  } catch (e) {}
                  navigate(`${routes.booking_checkout}?track=${encodeURIComponent(lastBookingId)}`, {
                    state: {
                      isTracking: true,
                      successData: bookingPayload
                    }
                  })
                }}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-extrabold text-sm rounded-xl transition-all cursor-pointer shadow-md shadow-rose-600/10"
              >
                Yes, Exit
              </button>
              <button
                type="button"
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-extrabold text-sm rounded-xl transition-all cursor-pointer"
              >
                No, Stay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Support & Help Center Modal */}
      <SupportHelpCenterModal
        isOpen={supportModalOpen}
        onClose={() => setSupportModalOpen(false)}
      />

      {/* Customer Account & Entry Flow Modals */}
      {showAccountPortal && (
        <CustomerAccountModal
          isOpen={showAccountPortal}
          onClose={() => setShowAccountPortal(false)}
          defaultTab="My Profile"
        />
      )}
      {showCustomerEntryModal && (
        <CustomerEntryFlowModal
          isOpen={showCustomerEntryModal}
          onClose={() => setShowCustomerEntryModal(false)}
          onSuccess={() => {
            setShowCustomerEntryModal(false)
            setLocalIsSignedIn(true)
            submitBooking()
          }}
        />
      )}
    </div>
  )
}

export default PackersMoversBookingHosurPage
