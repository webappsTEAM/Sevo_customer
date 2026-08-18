import React, { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import {
  MapPin, ChevronDown, ChevronUp, ArrowRight, ShieldCheck,
  Clock, Package, Boxes, X, Sparkles, Navigation, Truck,
  CheckCircle2, Star, Phone, HelpCircle, Loader2, LocateFixed,
  User, Mail, MessageSquare, AlertCircle, Bike, Check, Zap, Calendar
} from "lucide-react"
import { routes } from "../routes.js"
import { fetchServiceTiers, fetchLanes, fetchServiceAreas } from "../../api/logisticsService.js"
import { createBooking } from "../../api/bookingService.js"
import { apiRequestCustomerPhoneOTP, apiVerifyCustomerPhoneOTP } from "../../api/authService.js"
import { verifyOtpViaWebSocket } from "../../api/websocketService.js"
import { todayDateString } from "../../components/logistics/LogisticsKit.jsx"
import { SupportHelpCenterModal } from "../components/SupportHelpCenterModal.jsx"
import { useAuth } from "../../state/auth/useAuth.js"
import { CustomerAccountModal } from "./BookingPage.jsx"
import { CustomerEntryFlowModal } from "../components/CustomerEntryFlowModal.jsx"
import { getAddress } from "../../api/geocoding.js"

const LOGISTICS_CITY = "hosur"

/* ── 2 Wheeler Dimension Diagram matching user screenshot (40cm x 40cm box on bike) ── */
function TwoWheelerDimensionDiagram({ className = "w-full max-w-[240px] h-[120px]" }) {
  return (
    <svg viewBox="0 0 260 130" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="tw-diag-box" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
        <linearGradient id="tw-diag-bike" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#059669" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
      </defs>

      {/* Height Dimension for Box (Left: 40cm) */}
      <text x="18" y="58" fill="#475569" fontSize="14" fontWeight="700" fontFamily="system-ui, sans-serif" textAnchor="end">40cm</text>
      <line x1="28" y1="36" x2="28" y2="76" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="3 2" />
      <line x1="24" y1="36" x2="32" y2="36" stroke="#64748b" strokeWidth="1.5" />
      <line x1="24" y1="76" x2="32" y2="76" stroke="#64748b" strokeWidth="1.5" />

      {/* Width Dimension for Box (Top: 40cm) */}
      <text x="80" y="24" fill="#475569" fontSize="14" fontWeight="700" fontFamily="system-ui, sans-serif" textAnchor="middle">40cm</text>
      <line x1="58" y1="30" x2="102" y2="30" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="3 2" />
      <line x1="58" y1="26" x2="58" y2="34" stroke="#64748b" strokeWidth="1.5" />
      <line x1="102" y1="26" x2="102" y2="34" stroke="#64748b" strokeWidth="1.5" />

      {/* Ground Baseline & Soft Shadows */}
      <ellipse cx="88" cy="112" rx="18" ry="2.5" fill="#cbd5e1" opacity="0.6" />
      <ellipse cx="188" cy="112" rx="18" ry="2.5" fill="#cbd5e1" opacity="0.6" />
      <line x1="44" y1="112" x2="228" y2="112" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" />

      {/* Rear delivery box (40cm x 40cm) */}
      <rect x="58" y="38" width="44" height="40" rx="3" fill="url(#tw-diag-box)" stroke="#0f172a" strokeWidth="2" />
      <rect x="55" y="35" width="50" height="7" rx="2" fill="#334155" />
      <rect x="74" y="50" width="12" height="15" rx="1.5" fill="#f59e0b" />
      <path d="M58 58H102" stroke="#475569" strokeWidth="1" strokeDasharray="2 2" />

      {/* Bike Chassis & Tank */}
      <path d="M102 72L128 70L152 62L162 72L144 88H114L102 72Z" fill="url(#tw-diag-bike)" stroke="#1e293b" strokeWidth="2" />
      {/* Seat */}
      <path d="M100 68C100 64 108 62 120 62C132 62 140 66 140 70L100 70Z" fill="#1e293b" />
      {/* Engine & Lower Frame */}
      <rect x="122" y="84" width="24" height="16" rx="3" fill="#64748b" stroke="#334155" strokeWidth="1.5" />
      <circle cx="134" cy="92" r="4.5" fill="#475569" />
      {/* Exhaust Pipe */}
      <path d="M130 98H94C90 98 88 96 86 92" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" fill="none" />

      {/* Front Fork & Handlebar */}
      <line x1="160" y1="56" x2="188" y2="102" stroke="#475569" strokeWidth="3" strokeLinecap="round" />
      <path d="M152 50C158 48 164 50 170 50" stroke="#1e293b" strokeWidth="3.5" strokeLinecap="round" />
      {/* Headlight */}
      <circle cx="172" cy="60" r="5.5" fill="#38bdf8" stroke="#0284c7" strokeWidth="1.5" />
      <circle cx="172" cy="60" r="3" fill="#fef08a" />

      {/* Rear Wheel */}
      <circle cx="88" cy="102" r="14" fill="#1e293b" />
      <circle cx="88" cy="102" r="8" fill="#e2e8f0" stroke="#64748b" strokeWidth="1.5" />
      <circle cx="88" cy="102" r="3" fill="#059669" />

      {/* Front Wheel */}
      <circle cx="188" cy="102" r="14" fill="#1e293b" />
      <circle cx="188" cy="102" r="8" fill="#e2e8f0" stroke="#64748b" strokeWidth="1.5" />
      <circle cx="188" cy="102" r="3" fill="#059669" />
    </svg>
  )
}

/* ── Custom Vector Illustrations for Other Services ── */
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
      <path d="M71 40L76 40L73.5 46L70 46Z" fill="#ffffff" opacity="0.7" />
      <circle cx="89" cy="56" r="2.5" fill="#fef08a" />
      <rect x="88" y="59" width="6" height="3.5" rx="1.5" fill="#64748b" />
      <rect x="70" y="52" width="4" height="1.5" rx="0.5" fill="#1e40af" />
      <circle cx="32" cy="64" r="9.5" fill="#1e293b" />
      <circle cx="32" cy="64" r="5" fill="#94a3b8" />
      <circle cx="32" cy="64" r="2" fill="#ffffff" />
      <circle cx="76" cy="64" r="9.5" fill="#1e293b" />
      <circle cx="76" cy="64" r="5" fill="#94a3b8" />
      <circle cx="76" cy="64" r="2" fill="#ffffff" />
    </svg>
  )
}

function PackersMoversGraphic({ className = "w-28 h-20" }) {
  return (
    <svg viewBox="0 0 110 90" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="55" cy="74" rx="46" ry="5" fill="#dcfce7" />
      <path d="M26 22L34 34H18L26 22Z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1" />
      <line x1="26" y1="34" x2="26" y2="70" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
      <ellipse cx="26" cy="70" rx="6" ry="2" fill="#64748b" />
      <path d="M20 34L12 56H34L28 34Z" fill="#fef08a" opacity="0.3" />
      <rect x="22" y="48" width="18" height="20" rx="2" fill="#d97706" />
      <path d="M22 48L26 44H40L38 48H22Z" fill="#f59e0b" />
      <rect x="28" y="48" width="5" height="20" fill="#b45309" opacity="0.6" />
      <rect x="40" y="34" width="54" height="26" rx="6" fill="#1e40af" />
      <rect x="38" y="50" width="58" height="18" rx="5" fill="#2563eb" />
      <rect x="36" y="44" width="11" height="24" rx="4" fill="#3b82f6" />
      <rect x="87" y="44" width="11" height="24" rx="4" fill="#1d4ed8" />
      <line x1="42" y1="68" x2="40" y2="74" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="90" y1="68" x2="92" y2="74" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" />
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
      <rect x="80" y="92" width="8" height="12" fill="#0f172a" />
      <rect x="94" y="92" width="10" height="12" fill="#0f172a" />
      <rect x="48" y="92" width="8" height="12" fill="#0f172a" />
    </svg>
  )
}

/* ── Hosur & Nearby Location Suggestions Database ── */
/* ── Maps backend ServiceTier.slug → the illustration for that vehicle.
   Diagrams stay local (purely cosmetic); everything else (name, capacity,
   price, description) now comes from GET /api/logistics/tiers/. ── */
const TWO_WHEELER_DIAGRAM_BY_SLUG = {
  "2-wheeler": <TwoWheelerDimensionDiagram />,
  "2-wheeler-electric-express": <TwoWheelerDimensionDiagram />,
}

const HOSUR_LOCATIONS_DATABASE = [
  { name: "Hosur Bus Stand", subtitle: "Central Hosur, Tamil Nadu", category: "Hosur Central" },
  { name: "Hosur Railway Station", subtitle: "Station Road, Hosur", category: "Hosur Central" },
  { name: "Hosur Flower Market", subtitle: "Bagalur Road, Hosur", category: "Hosur Central" },
  { name: "Hosur Cattle Farm", subtitle: "Mathigiri, Hosur", category: "Hosur Central" },
  { name: "Hosur IT Park (ELCOT)", subtitle: "Ring Road, Hosur", category: "Hosur Central" },
  { name: "Hosur Taluk Office", subtitle: "NH44, Hosur", category: "Hosur Central" },
  { name: "Hosur Ring Road", subtitle: "Outer Ring Road, Hosur", category: "Hosur Central" },
  { name: "Harita (Hosur)", subtitle: "TVS Motor Corridor, Hosur", category: "Hosur Area" },
  { name: "SIPCOT Phase 1", subtitle: "Industrial Complex, Hosur", category: "SIPCOT Industrial" },
  { name: "SIPCOT Phase 2", subtitle: "Industrial Area, Hosur", category: "SIPCOT Industrial" },
  { name: "SIPCOT Phase 3", subtitle: "Zuzuvadi, Hosur", category: "SIPCOT Industrial" },
  { name: "SIPCOT Phase 4", subtitle: "Moranapalli, Hosur", category: "SIPCOT Industrial" },
  { name: "Mookandapalli", subtitle: "Industrial Belt, Hosur", category: "Hosur Area" },
  { name: "Moranapalli", subtitle: "Industrial Hub, Hosur", category: "Hosur Area" },
  { name: "Ashok Leyland Plant 1 & 2", subtitle: "SIPCOT, Hosur", category: "Hosur Industrial" },
  { name: "TVS Motor Factory", subtitle: "Harita, Hosur", category: "Hosur Industrial" },
  { name: "Titan Industries", subtitle: "SIPCOT Phase 1, Hosur", category: "Hosur Industrial" },
  { name: "Exide Industries", subtitle: "SIPCOT, Hosur", category: "Hosur Industrial" },
  { name: "Bagalur Road", subtitle: "Hosur, Tamil Nadu", category: "Hosur Area" },
  { name: "Mathigiri", subtitle: "Hosur, Tamil Nadu", category: "Hosur Area" },
  { name: "Zuzuvadi", subtitle: "Hosur Border, Tamil Nadu", category: "Hosur Area" },
  { name: "Avalapalli Road", subtitle: "Hosur, Tamil Nadu", category: "Hosur Area" },
  { name: "Denkanikottai Road", subtitle: "Hosur, Tamil Nadu", category: "Hosur Area" },
  { name: "Rayakottai Road", subtitle: "Hosur, Tamil Nadu", category: "Hosur Area" },
  { name: "Thally Road", subtitle: "Hosur, Tamil Nadu", category: "Hosur Area" },
  { name: "Kelamangalam Road", subtitle: "Hosur, Tamil Nadu", category: "Hosur Area" },
  { name: "Alasanatham", subtitle: "Hosur, Tamil Nadu", category: "Hosur Area" },
  { name: "Dinnur", subtitle: "Hosur, Tamil Nadu", category: "Hosur Area" },
  { name: "Kamaraj Nagar", subtitle: "Hosur, Tamil Nadu", category: "Hosur Area" },
  { name: "Shanthi Nagar", subtitle: "Hosur, Tamil Nadu", category: "Hosur Area" },
  { name: "Nethaji Nagar", subtitle: "Hosur, Tamil Nadu", category: "Hosur Area" },
  { name: "Chennathur", subtitle: "Hosur, Tamil Nadu", category: "Hosur Area" },
  { name: "Dharga", subtitle: "Hosur, Tamil Nadu", category: "Hosur Area" },
  { name: "Poonapalli", subtitle: "Hosur, Tamil Nadu", category: "Hosur Area" },
  { name: "Bagalur Town", subtitle: "Hosur Taluk, Tamil Nadu", category: "Near Hosur" },
  { name: "Berigai", subtitle: "Hosur Taluk, Tamil Nadu", category: "Near Hosur" },
  { name: "Attibele Border & Toll Plaza", subtitle: "Bengaluru Border (~8 Kms)", category: "Near Hosur" },
  { name: "Attibele Industrial Area", subtitle: "Anekal Taluk (~10 Kms)", category: "Near Hosur" },
  { name: "Anekal Town", subtitle: "Karnataka (~18 Kms)", category: "Near Hosur" },
  { name: "Chandapura Circle", subtitle: "Bengaluru Highway (~18 Kms)", category: "Bengaluru Hub" },
  { name: "Bommasandra Industrial Area", subtitle: "Bengaluru (~22 Kms)", category: "Bengaluru Hub" },
  { name: "Hebbagodi", subtitle: "Hosur Road, Bengaluru (~24 Kms)", category: "Bengaluru Hub" },
  { name: "Electronic City Phase 1", subtitle: "Bengaluru (~28 Kms)", category: "Bengaluru Hub" },
  { name: "Electronic City Phase 2", subtitle: "Bengaluru (~26 Kms)", category: "Bengaluru Hub" },
  { name: "Jigani Industrial Area", subtitle: "Bengaluru (~25 Kms)", category: "Bengaluru Hub" },
  { name: "Sarjapur Road", subtitle: "Bengaluru (~32 Kms)", category: "Bengaluru Hub" },
  { name: "Bengaluru Central (Majestic)", subtitle: "Karnataka (40 Kms)", category: "Intercity Route" },
  { name: "Krishnagiri Town", subtitle: "Tamil Nadu (55 Kms)", category: "Intercity Route" },
]

function filterLocationSuggestions(searchText) {
  if (!searchText || !searchText.trim()) {
    return [
      { name: "Hosur Bus Stand", subtitle: "Central Hosur, Tamil Nadu", category: "Hosur Central" },
      { name: "SIPCOT Phase 1", subtitle: "Industrial Area, Hosur", category: "SIPCOT Industrial" },
      { name: "SIPCOT Phase 2", subtitle: "Industrial Complex, Hosur", category: "SIPCOT Industrial" },
      { name: "Mathigiri", subtitle: "Hosur, Tamil Nadu", category: "Hosur Area" },
      { name: "Attibele Border & Toll Plaza", subtitle: "Bengaluru Border (~8 Kms)", category: "Near Hosur" },
      { name: "Electronic City Phase 1", subtitle: "Bengaluru (~28 Kms)", category: "Bengaluru Hub" },
      { name: "Bengaluru Central (Majestic)", subtitle: "Karnataka (40 Kms)", category: "Intercity Route" },
      { name: "Krishnagiri Town", subtitle: "Tamil Nadu (55 Kms)", category: "Intercity Route" },
    ]
  }

  const query = searchText.trim().toLowerCase()
  const exactStarts = []
  const wordStarts = []
  const containsMatches = []

  HOSUR_LOCATIONS_DATABASE.forEach((item) => {
    const nameLow = item.name.toLowerCase()
    const subLow = item.subtitle.toLowerCase()
    const catLow = item.category.toLowerCase()

    if (nameLow.startsWith(query)) {
      exactStarts.push(item)
    } else if (
      nameLow.split(/[\s,/-]+/).some((w) => w.startsWith(query)) ||
      subLow.split(/[\s,/-]+/).some((w) => w.startsWith(query))
    ) {
      wordStarts.push(item)
    } else if (nameLow.includes(query) || subLow.includes(query) || catLow.includes(query)) {
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

const DELIVERY_DATES = generateUpcomingDates()

const DELIVERY_SLOTS = {
  "Morning": ["6AM-7AM", "7AM-8AM", "8AM-9AM", "9AM-10AM", "10AM-11AM", "11AM-12PM"],
  "Afternoon": ["12PM-1PM", "1PM-2PM", "2PM-3PM", "3PM-4PM", "4PM-5PM"],
  "Evening": ["5PM-6PM", "6PM-7PM", "7PM-8PM", "8PM-9PM", "9PM-10PM"]
}

/* ── Two-Wheeler Booking in Hosur Page ── */
export function TwoWheelerBookingHosurPage() {
  const navigate = useNavigate()

  // Form State
  const [pickup, setPickup] = useState("")
  const [drop, setDrop] = useState("")
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [userType, setUserType] = useState("Personal Parcels & Documents")
  const [selectedRoute, setSelectedRoute] = useState(null)

  // Booking Flow State
  const [vehicleSelectorOpen, setVehicleSelectorOpen] = useState(false)
  const [selectedVehicle, setSelectedVehicle] = useState(null)
  const [slotStepperOpen, setSlotStepperOpen] = useState(false)
  const [stepperStep, setStepperStep] = useState(3)
  const [selectedDate, setSelectedDate] = useState(DELIVERY_DATES[0])
  const [selectedSlot, setSelectedSlot] = useState("9AM-10AM")
  const [expandedSlotCategory, setExpandedSlotCategory] = useState("Morning")
  const [bookingSuccessOpen, setBookingSuccessOpen] = useState(false)
  const [supportModalOpen, setSupportModalOpen] = useState(false)
  const [noServiceRoute, setNoServiceRoute] = useState(false)
  const { user } = useAuth()
  const [showAccountPortal, setShowAccountPortal] = useState(false)
  const [showCustomerEntryModal, setShowCustomerEntryModal] = useState(false)
  const [localIsSignedIn, setLocalIsSignedIn] = useState(false)
  const isSignedIn = Boolean(user) || localIsSignedIn

  // Prefill user details if signed in
  useEffect(() => {
    if (user) {
      const fullName = user.full_name || user.fullName || user.first_name || user.firstName || user.username
      if (fullName && !name) setName(fullName)
      if (user.phone && !phone) setPhone(user.phone)
    }
  }, [user])

  // Suggestions Dropdown State
  const [showPickupSuggestions, setShowPickupSuggestions] = useState(false)
  const [showDropSuggestions, setShowDropSuggestions] = useState(false)
  const pickupWrapperRef = useRef(null)
  const dropWrapperRef = useRef(null)

  // Live Location Detection State
  const [isDetectingLocation, setIsDetectingLocation] = useState(false)
  const [locationStatus, setLocationStatus] = useState("")

  // Details Modal
  const [activeVehicleDetails, setActiveVehicleDetails] = useState(null)

  // Lock body scroll when Know More modal is open
  useEffect(() => {
    document.body.style.overflow = activeVehicleDetails ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [activeVehicleDetails])

  // FAQ state
  const [openFaq, setOpenFaq] = useState(null)

  // Catalog data — fetched from /api/logistics/ (backend/logistics app),
  // replacing what used to be hardcoded TWO_WHEELER_VEHICLES/POPULAR_ROUTES/
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
          fetchServiceTiers("two_wheeler", LOGISTICS_CITY),
          fetchLanes("two_wheeler", LOGISTICS_CITY),
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
    window.scrollTo(0, 0)
    document.body.style.overflow = "unset"
  }, [])

  // Close dropdowns on outside click or escape
  useEffect(() => {
    const handleDocumentClick = (e) => {
      if (pickupWrapperRef.current && !pickupWrapperRef.current.contains(e.target)) {
        setShowPickupSuggestions(false)
      }
      if (dropWrapperRef.current && !dropWrapperRef.current.contains(e.target)) {
        setShowDropSuggestions(false)
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

  const pickupSuggestions = filterLocationSuggestions(pickup)
  const dropSuggestions = filterLocationSuggestions(drop)

  // Live location fetch handler
  const handleFetchLiveLocation = (e) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }

    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser. Please enter the pickup address manually.")
      return
    }

    setIsDetectingLocation(true)
    setLocationStatus("Detecting...")

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        try {
          const formatted = await getAddress(latitude, longitude)
          setPickup(formatted || `Current Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`)
          setLocationStatus("Detected")
          setTimeout(() => setLocationStatus(""), 2500)
        } catch (err) {
          console.warn("Reverse geocoding error:", err)
          setPickup(`Current Location (Hosur - ${latitude.toFixed(4)}, ${longitude.toFixed(4)})`)
          setLocationStatus("Detected")
          setTimeout(() => setLocationStatus(""), 2500)
        } finally {
          setIsDetectingLocation(false)
        }
      },
      (error) => {
        console.error("Geolocation error:", error)
        setIsDetectingLocation(false)
        setLocationStatus("")
        if (error.code === 1) {
          alert("Location permission was denied. Please enter your pickup address manually.")
        } else {
          alert("GPS location unavailable. Please enter your pickup address manually.")
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    )
  }

  // Static fallback — used only if the /api/logistics/ fetch above fails or
  // hasn't resolved yet, so this page keeps working even if the backend is
  // briefly unreachable.

  const VEHICLE_SUITABILITY_MAP = {
    "2-wheeler": {
      suitableFor: [
        "Small parcels & packages",
        "Documents & files",
        "Clothing & accessories",
        "Medicines & essentials",
        "Food & grocery orders",
        "Small electronic items"
      ],
      bestFor: "Small, lightweight local deliveries."
    },
    "2-wheeler-electric-express": {
      suitableFor: [
        "Small parcels & packages",
        "Clothing & accessories",
        "Food & grocery orders",
        "Medicines & essentials",
        "Small electronic items",
        "Urgent deliveries"
      ],
      bestFor: "Fast and lightweight local deliveries."
    }
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
  function tierToVehicle(tier) {
    const suitableList = (Array.isArray(tier.includes) && tier.includes.length > 0)
      ? tier.includes
      : (VEHICLE_SUITABILITY_MAP[tier.slug]?.suitableFor || [])
    const bestForText = tier.description || VEHICLE_SUITABILITY_MAP[tier.slug]?.bestFor || ""
    const isBadgeValid = isBadgeActive(tier.duration, tier.updated_at)
    const badgeText = isBadgeValid ? (tier.icon || "") : ""

    return {
      id: tier.slug,
      name: tier.name,
      capacity: tier.capacity_label,
      description: tier.description,
      badge: badgeText,
      suitableFor: suitableList,
      bestFor: bestForText,
      price: `₹${Number(tier.starting_price).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`,
      diagram: TWO_WHEELER_DIAGRAM_BY_SLUG[tier.slug] || <TwoWheelerDimensionDiagram />,
      details: {
        name: tier.name,
        capacity: tier.capacity_label ? `${tier.capacity_label} capacity` : "Standard capacity",
        badge: badgeText,
        suitableFor: suitableList,
        bestFor: bestForText,
      },
      _tierId: tier.id,
    }
  }

  const TWO_WHEELER_VEHICLES = fetchedTiers.map(tierToVehicle)

  const HOSUR_AREAS = serviceAreas.map((a) => a.name)

  const POPULAR_ROUTES = fetchedLanes.map((lane) => ({
    to: lane.destination_label,
    distance: lane.distance_km ? `${Number(lane.distance_km)} km` : "",
    fare: `₹${Number(lane.fare).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`,
    time: lane.eta_label,
    _laneId: lane.id,
  }))

  // FAQs tailored for 2 Wheeler
  const FAQS = [
    {
      q: "What is the maximum weight and parcel size for 2 Wheeler delivery?",
      a: "Our two-wheelers can comfortably carry packages weighing up to 20 kg with dimensions up to 40 cm x 40 cm x 40 cm in safe, weatherproof cargo boxes."
    },
    {
      q: "How fast will a rider arrive at my pickup address in Hosur?",
      a: "With our dense rider network across Hosur and SIPCOT, a verified delivery partner is assigned immediately and arrives at your pickup location within 10–15 minutes."
    },
    {
      q: "Can I send important documents, keys, or medicines securely?",
      a: "Yes! Two-wheeler delivery is ideal for time-sensitive parcels, corporate contracts, legal paperwork, keys, gifts, and pharmacy items with real-time live GPS tracking and secure OTP delivery."
    },
    {
      q: "What are the payment options available for 2 Wheeler bookings?",
      a: "You can pay securely via UPI (Google Pay, PhonePe, Paytm), Credit/Debit Cards, Net Banking, or Cash on Pickup/Delivery to the rider partner."
    }
  ]

  // Served areas validation
  const SERVED_AREAS = [
    "hosur", "sipcot", "bagalur", "mathigiri", "zuzuvadi", "avalapalli",
    "moranapalli", "mookandapalli", "denkanikottai", "rayakottai", "thally",
    "alasanatham", "dinnur", "kelamangalam", "kamaraj", "shanthi",
    "nethaji", "chennathur", "dharga", "poonapalli", "berigai",
    "attibele", "anekal", "chandapura", "bommasandra", "hebbagodi",
    "electronic city", "jigani", "sarjapur", "silk board", "koramangala",
    "bengaluru", "bangalore", "whitefield", "kempegowda", "ahmedabad"
  ]

  const isRouteServed = (pickupVal, dropVal) => {
    const combined = (pickupVal + " " + dropVal).toLowerCase()
    return SERVED_AREAS.some((area) => combined.includes(area))
  }

  const handleGetEstimate = (e) => {
    if (e) e.preventDefault()
    if (pickup && drop && !isRouteServed(pickup, drop)) {
      setNoServiceRoute(true)
      return
    }
    setNoServiceRoute(false)
    setVehicleSelectorOpen(true)
    if (!selectedVehicle) setSelectedVehicle(TWO_WHEELER_VEHICLES[0])
  }

  // Persists the booking to the backend (POST /api/booking/ — see
  // service_requests.BookingCreateView).
  const submitBooking = async () => {
    setBookingError("")
    setBookingSubmitting(true)
    try {
      const vehicle = selectedVehicle || TWO_WHEELER_VEHICLES[0]
      const fare = Number(String(vehicle.price).replace(/[^0-9.]/g, "")) || 0
      
      let dateString = todayDateString()
      if (selectedDate && selectedDate.fullDate) {
        const d = selectedDate.fullDate
        dateString = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      }

      const payload = {
        customer_name: name || "Guest",
        phone,
        service_category: "goods_transport_two_wheeler",
        issue_title: `Two-wheeler delivery — ${vehicle.name}`,
        description: userType,
        address: pickup || "Hosur",
        drop_address: drop,
        preferred_date: dateString,
        preferred_time: selectedSlot || "Morning",
        total_amount: fare,
        payment_method: "COD",
        cart_data: [{ tier: vehicle.name, price: vehicle.price, route: selectedRoute?.to || null, date: selectedDate?.value, slot: selectedSlot }],
      }
      if (vehicle._tierId) payload.logistics_tier = vehicle._tierId
      if (selectedRoute?._laneId) payload.logistics_lane = selectedRoute._laneId

      const res = await createBooking(payload)
      setLastBookingId(res?.data?.request_id || res?.request_id || null)
      setSlotStepperOpen(false)
      setBookingSuccessOpen(true)
    } catch (err) {
      setBookingError(err?.body?.message || "Couldn't confirm your booking. Please try again.")
    } finally {
      setBookingSubmitting(false)
    }
  }

  const handleBookNow = () => {
    // Called from vehicle selector modal "Book Now" -> Opens Date & Slot Stepper
    setVehicleSelectorOpen(false)
    setStepperStep(3)
    setSlotStepperOpen(true)
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

  const handleVerifyOtp = async (forcedVal = null) => {
    const code = (forcedVal || otpValue).replace(/\D/g, "")
    if (code.length < 6 || otpLoading) return
    setOtpLoading(true)
    setBookingError("")
    try {
      let verified = false
      try {
        const wsRes = await verifyOtpViaWebSocket(phone, code)
        if (wsRes && wsRes.success) verified = true
      } catch {
        // fallback
      }
      if (!verified) {
        await apiVerifyCustomerPhoneOTP(phone, code)
      }
      setLocalIsSignedIn(true)
      setLoginModalOpen(false)
      setOtpStep(false)
      setOtpValue("")
      setOtpSent(false)
      await submitBooking()
    } catch (err) {
      setBookingError(err?.body?.detail || err?.message || "Invalid OTP. Please check the code.")
    } finally {
      setOtpLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FAFCFB] text-slate-800 font-sans antialiased">
      {/* ── Top Header Navigation (Uniform Image 2 Style) ─────────────── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(routes.landing)}>
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm">
              <Bike className="w-5 h-5" strokeWidth={2.5} />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-extrabold tracking-tight text-slate-900 leading-none">
                CalServices
              </span>
              <span className="text-[10px] font-semibold text-emerald-700 tracking-wide uppercase mt-0.5">
                Two-Wheeler Delivery
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

      {/* ── Hero Section (Uniform Image 2 Style) ────────────────────── */}
      <section 
        className="relative pt-10 pb-8 sm:pt-14 sm:pb-12 border-b border-slate-100/60 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url('/hero_twowheeler_bg.png')` }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-slate-950/55 to-slate-950/80"></div>
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 text-center z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-emerald-300 text-xs font-bold tracking-wide mb-4 shadow-sm border border-white/25 backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
            Hosur Two-Wheeler Service
          </div>

          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight max-w-3xl mx-auto drop-shadow-lg">
            Affordable and Trusted Two-Wheeler Delivery in Hosur
          </h1>

          <p className="mt-4 text-sm sm:text-base text-slate-200 max-w-2xl mx-auto leading-relaxed drop-shadow">
            Whether you're sending documents, daily essentials, or parcel deliveries across the city, our two-wheeler courier service in Hosur offers fast, safe, and cost-effective delivery
          </p>

          <div className="mt-5 flex items-center justify-center gap-3 text-xs font-semibold text-emerald-300">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-300" /> On-Demand in 15 mins
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-emerald-300" /> Verified Drivers
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4 text-emerald-300" /> Transparent Pricing
            </span>
          </div>
        </div>

        {/* ── Quick Estimate Bar (Matching Image 2 Exactly) ────────── */}
        <div id="estimate-bar" className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 mt-8">
          <form
            onSubmit={handleGetEstimate}
            className="bg-white rounded-2xl sm:rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200/80 p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3 sm:gap-3.5 items-end"
          >
            {/* Pickup */}
            <div ref={pickupWrapperRef} className="flex flex-col text-left relative">
              <div className="h-5 mb-1.5 flex items-center justify-between">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1 whitespace-nowrap">
                  <span className="text-emerald-600">●</span> Pickup Location *
                </label>
                <button
                  type="button"
                  onClick={handleFetchLiveLocation}
                  disabled={isDetectingLocation}
                  title="Detect and use live GPS location"
                  className="inline-flex items-center gap-1 text-[9px] font-extrabold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-1.5 py-0.5 rounded transition-all cursor-pointer border border-emerald-200/60 shadow-2xs whitespace-nowrap shrink-0"
                >
                  {isDetectingLocation ? (
                    <>
                      <Loader2 className="w-2.5 h-2.5 animate-spin text-emerald-600" />
                      <span>Locating...</span>
                    </>
                  ) : locationStatus ? (
                    <>
                      <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                      <span>{locationStatus}</span>
                    </>
                  ) : (
                    <>
                      <LocateFixed className="w-2.5 h-2.5 text-emerald-600" />
                      <span>Live GPS</span>
                    </>
                  )}
                </button>
              </div>
              <div className="relative flex items-center">
                <input
                  type="text"
                  placeholder="Enter pickup location in Hosur"
                  value={pickup}
                  onFocus={() => {
                    setShowPickupSuggestions(true)
                    setShowDropSuggestions(false)
                  }}
                  onClick={() => {
                    setShowPickupSuggestions(true)
                    setShowDropSuggestions(false)
                  }}
                  onChange={(e) => {
                    setPickup(e.target.value)
                    setShowPickupSuggestions(true)
                  }}
                  className="w-full pl-3 pr-8 h-10 sm:h-11 text-xs sm:text-sm bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-all text-slate-800 font-medium"
                  required
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={handleFetchLiveLocation}
                  disabled={isDetectingLocation}
                  title="Fetch live GPS location"
                  className="absolute right-2 text-slate-400 hover:text-emerald-600 p-1 rounded-lg hover:bg-emerald-50 transition-colors cursor-pointer"
                >
                  {isDetectingLocation ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                  ) : (
                    <LocateFixed className="w-3.5 h-3.5 hover:scale-110 transition-transform" />
                  )}
                </button>
              </div>

              {/* Pickup Suggestions Dropdown */}
              {showPickupSuggestions && (
                <div className="absolute top-full left-0 mt-1.5 w-[320px] sm:w-[370px] max-w-[90vw] bg-white rounded-2xl shadow-2xl border border-slate-200/90 z-50 overflow-hidden max-h-72 overflow-y-auto">
                  <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <span>{pickup ? `Suggestions for "${pickup}"` : "Suggested Hosur Locations"}</span>
                    <span className="text-[9px] text-emerald-700 font-semibold">{pickupSuggestions.length} found</span>
                  </div>
                  <div className="p-1 space-y-0.5">
                    {pickupSuggestions.length > 0 ? (
                      pickupSuggestions.map((loc, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault()
                            const cleanSub = loc.subtitle.split("(")[0].trim().replace(/,\s*$/, "")
                            setPickup(`${loc.name}, ${cleanSub}`)
                            setShowPickupSuggestions(false)
                          }}
                          className="w-full text-left px-3 py-2 rounded-xl hover:bg-emerald-50 text-slate-800 hover:text-emerald-950 transition-colors flex items-center justify-between gap-2.5 group cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div className="w-7 h-7 rounded-lg bg-slate-100 group-hover:bg-emerald-100 flex items-center justify-center shrink-0 transition-colors">
                              <MapPin className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-700 transition-colors" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-slate-800 group-hover:text-emerald-900 leading-snug">
                                {loc.name}
                              </p>
                              <p className="text-[10px] text-slate-500 group-hover:text-emerald-700 leading-none mt-0.5">
                                {loc.subtitle}
                              </p>
                            </div>
                          </div>
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-slate-100 group-hover:bg-emerald-200/70 text-slate-600 group-hover:text-emerald-800 shrink-0">
                            {loc.category}
                          </span>
                        </button>
                      ))
                    ) : (
                      <div className="p-3 text-center">
                        <p className="text-xs text-slate-500">No matching location found for "{pickup}"</p>
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault()
                            setShowPickupSuggestions(false)
                          }}
                          className="mt-1 text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer"
                        >
                          Use "{pickup}" as pickup address
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Drop */}
            <div ref={dropWrapperRef} className="flex flex-col text-left relative">
              <div className="h-5 mb-1.5 flex items-center">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1 whitespace-nowrap">
                  <span className="text-rose-500">●</span> Delivery Destination *
                </label>
              </div>
              <input
                type="text"
                placeholder="Enter delivery destination"
                value={drop}
                onFocus={() => {
                  setShowDropSuggestions(true)
                  setShowPickupSuggestions(false)
                }}
                onClick={() => {
                  setShowDropSuggestions(true)
                  setShowPickupSuggestions(false)
                }}
                onChange={(e) => {
                  setDrop(e.target.value)
                  setShowDropSuggestions(true)
                }}
                className="w-full px-3 h-10 sm:h-11 text-xs sm:text-sm bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-all text-slate-800 font-medium"
                required
                autoComplete="off"
              />

              {/* Drop Suggestions Dropdown */}
              {showDropSuggestions && (
                <div className="absolute top-full left-0 sm:left-auto sm:right-0 lg:left-0 lg:right-auto mt-1.5 w-[320px] sm:w-[370px] max-w-[90vw] bg-white rounded-2xl shadow-2xl border border-slate-200/90 z-50 overflow-hidden max-h-72 overflow-y-auto">
                  <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <span>{drop ? `Suggestions for "${drop}"` : "Suggested Delivery Destinations"}</span>
                    <span className="text-[9px] text-emerald-700 font-semibold">{dropSuggestions.length} found</span>
                  </div>
                  <div className="p-1 space-y-0.5">
                    {dropSuggestions.length > 0 ? (
                      dropSuggestions.map((loc, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault()
                            const cleanSub = loc.subtitle.split("(")[0].trim().replace(/,\s*$/, "")
                            setDrop(`${loc.name}, ${cleanSub}`)
                            setShowDropSuggestions(false)
                          }}
                          className="w-full text-left px-3 py-2 rounded-xl hover:bg-emerald-50 text-slate-800 hover:text-emerald-950 transition-colors flex items-center justify-between gap-2.5 group cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div className="w-7 h-7 rounded-lg bg-slate-100 group-hover:bg-emerald-100 flex items-center justify-center shrink-0 transition-colors">
                              <MapPin className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-700 transition-colors" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-slate-800 group-hover:text-emerald-900 leading-snug">
                                {loc.name}
                              </p>
                              <p className="text-[10px] text-slate-500 group-hover:text-emerald-700 leading-none mt-0.5">
                                {loc.subtitle}
                              </p>
                            </div>
                          </div>
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-slate-100 group-hover:bg-emerald-200/70 text-slate-600 group-hover:text-emerald-800 shrink-0">
                            {loc.category}
                          </span>
                        </button>
                      ))
                    ) : (
                      <div className="p-3 text-center">
                        <p className="text-xs text-slate-500">No matching location found for "{drop}"</p>
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault()
                            setShowDropSuggestions(false)
                          }}
                          className="mt-1 text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer"
                        >
                          Use "{drop}" as destination
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Name */}
            <div className="flex flex-col text-left">
              <div className="h-5 mb-1.5 flex items-center">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                  Sender Name *
                </label>
              </div>
              <input
                type="text"
                placeholder="Your Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 h-10 sm:h-11 text-xs sm:text-sm bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-all text-slate-800 font-medium"
                required
              />
            </div>

            {/* Phone */}
            <div className="flex flex-col text-left">
              <div className="h-5 mb-1.5 flex items-center">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                  Mobile Number *
                </label>
              </div>
              <input
                type="tel"
                placeholder="10-digit mobile number"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, "").slice(0, 10))}
                className="w-full px-3 h-10 sm:h-11 text-xs sm:text-sm bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-all text-slate-800 font-medium"
                required
              />
            </div>

            {/* Describe You Best */}
            <div className="flex flex-col text-left">
              <div className="h-5 mb-1.5 flex items-center">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                  Parcel Category *
                </label>
              </div>
              <select
                value={userType}
                onChange={(e) => setUserType(e.target.value)}
                className="w-full px-3 h-10 sm:h-11 text-xs sm:text-sm bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-all text-slate-800 font-medium cursor-pointer"
              >
                <option value="Personal Parcels & Documents">Personal Parcels & Documents</option>
                <option value="Business & SME Courier">Business & SME Courier</option>
                <option value="Retail & E-Commerce Orders">Retail & E-Commerce Orders</option>
                <option value="Medical & Urgent Essentials">Medical & Urgent Essentials</option>
              </select>
            </div>

            {/* Submit Button */}
            <div className="flex flex-col justify-end">
              <div className="h-5 mb-1.5 hidden lg:block" />
              <button
                type="submit"
                className="w-full h-10 sm:h-11 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-extrabold text-xs sm:text-sm rounded-xl transition-all shadow-md shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
              >
                <span>Calculate Fare</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </button>
            </div>
          </form>

          {/* No-Service Route Warning */}
          {noServiceRoute && (
            <div className="mt-3 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 border-rose-400 bg-rose-50 text-rose-700 text-xs font-extrabold uppercase tracking-widest animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              WE DO NOT OPERATE FOR THE SELECTED ROUTE
            </div>
          )}
        </div>
      </section>

      {/* ── Section: Book Two-Wheelers in Hosur (Uniform Centered Cards Style) ── */}
      <section className="pt-6 sm:pt-8 pb-12 sm:pb-16 max-w-5xl mx-auto px-4 sm:px-6">
        <div className="text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Book Two-Wheelers in Hosur
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-2">
            Fast, secure &amp; economical courier delivery right to your recipient's doorstep
          </p>
        </div>

        {/* Centered Cards matching Truck UI layout / dynamic active packages */}
        {TWO_WHEELER_VEHICLES.length === 0 ? (
          <div className="max-w-md mx-auto mt-6 sm:mt-8 p-6 sm:p-8 bg-slate-50 border border-slate-200 rounded-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-3">
              <Bike className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-800 text-base">Service Temporarily Unavailable</h3>
            <p className="text-xs text-slate-500 mt-1">
              Two-wheeler courier packages in this region are currently inactive or undergoing maintenance. Please check back shortly.
            </p>
          </div>
        ) : (
          <div className={`grid ${TWO_WHEELER_VEHICLES.length === 1 ? 'grid-cols-1 max-w-md' : 'grid-cols-1 sm:grid-cols-2 max-w-2xl'} gap-6 mx-auto mt-6 sm:mt-8 items-stretch`}>
            {TWO_WHEELER_VEHICLES.map((vehicle) => (
              <div
                key={vehicle.id}
                className="bg-white rounded-xl border border-slate-200/90 p-6 sm:p-7 flex flex-col items-center text-center shadow-none hover:border-slate-300 transition-all justify-between relative"
              >
                {/* Highlight Badge if configured */}
                {vehicle.badge && (
                  <span
                    className={`absolute top-3.5 right-3.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border shadow-2xs ${
                      vehicle.badge.toLowerCase().includes("popular")
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : vehicle.badge.toLowerCase().includes("rare")
                        ? "bg-slate-100 text-slate-700 border-slate-200"
                        : "bg-blue-50 text-blue-700 border-blue-200"
                    }`}
                  >
                    ★ {vehicle.badge}
                  </span>
                )}

                {/* Top Graphic with dimension markings */}
                <div className="w-full flex justify-center items-center my-1">
                  {vehicle.diagram}
                </div>

                {/* Weight Pill Badge */}
                <div className="bg-[#F0F4F9] text-slate-800 text-xs font-bold px-3 py-1 rounded-md inline-flex items-center gap-1.5 mt-4">
                  <WeightIcon className="w-3.5 h-3.5 text-slate-900 fill-slate-900" />
                  <span>{vehicle.capacity}</span>
                </div>

                {/* Name & Price */}
                <div className="mt-3">
                  <h3 className="text-xl font-bold text-slate-900">{vehicle.name}</h3>
                  {vehicle.description && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{vehicle.description}</p>
                  )}
                  <p className="text-sm text-slate-600 mt-1.5">
                    Starting from <span className="font-bold text-slate-900 text-base">{vehicle.price}</span>
                  </p>
                </div>

                {/* Know More dotted link */}
                <button
                  type="button"
                  onClick={() => setActiveVehicleDetails(vehicle)}
                  className="text-xs sm:text-sm font-bold text-emerald-700 hover:text-emerald-800 border-b border-dotted border-emerald-600 hover:border-emerald-700 mt-5 cursor-pointer pb-0.5 inline-block focus:outline-none"
                >
                  Know More
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Section: Popular Routes from Hosur ────────────────────── */}
      <section className="py-12 sm:py-16 bg-slate-50/80 border-y border-slate-200/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Popular Two-Wheeler Delivery Routes from Hosur
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Guaranteed lowest courier rates with live tracking across Hosur, SIPCOT &amp; Bengaluru borders
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

      {/* ── Section: Think Delivery, Think CalServices! (App Banner) ── */}
      <section className="py-12 bg-emerald-900 text-white relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="text-center md:text-left max-w-lg">
            <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
              Mobile App Experience
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1">
              Think Delivery, Think CalServices!
            </h2>
            <p className="text-sm text-emerald-100 mt-2">
              Get the CalServices mobile app to start booking your two-wheeler courier deliveries, track live riders, and manage corporate dispatches with a single tap.
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

      {/* ── Section: Other Services to Choose From ─────────────── */}
      <section className="py-12 sm:py-16 max-w-4xl mx-auto px-4 sm:px-6 text-center">
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

          {/* Packers and Movers Card */}
          <div
            onClick={() => navigate(routes.packers_movers_booking_hosur || routes.landing)}
            className="bg-[#f0f3fa] rounded-3xl p-7 border border-slate-200/60 hover:shadow-lg transition-all cursor-pointer flex flex-col items-center gap-3 group"
          >
            <div className="h-24 flex items-center justify-center">
              <PackersMoversGraphic className="w-28 h-20 group-hover:scale-105 transition-transform" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Packers and Movers</h3>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); navigate(routes.packers_movers_booking_hosur || routes.landing) }}
              className="w-9 h-9 rounded-full bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center shadow-md transition-colors cursor-pointer mt-1"
            >
              <ArrowRight className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      </section>

      {/* ── Section: Two-Wheeler Courier Delivery Details in Hosur ── */}
      <section className="py-12 bg-white border-y border-slate-200/70">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mb-4">
            Two-Wheeler Parcel &amp; Courier Delivery in Hosur
          </h2>
          <div className="text-xs sm:text-sm text-slate-600 leading-relaxed space-y-3">
            <p>
              Send parcels, documents, and corporate supplies across Hosur hassle-free with CalServices! Download CalServices and book an on-demand two-wheeler delivery partner in under 60 seconds.
            </p>
            <p>
              CalServices offers transparent, economical per-km rates allowing you to send packages anywhere in Hosur, SIPCOT industrial zones, and nearby Karnataka borders safely.
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

      {/* ── Modals: Vehicle Details, Vehicle Selector, Login/OTP, Success ── */}
      {/* 1. Vehicle Details Drawer */}
      {activeVehicleDetails && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-extrabold text-slate-900">{activeVehicleDetails.details.name}</h3>
              <button
                onClick={() => setActiveVehicleDetails(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm font-semibold text-slate-500 mt-1 mb-4">{activeVehicleDetails.details.capacity}</p>

            <div className="flex items-center justify-center py-4 bg-slate-50 rounded-2xl mb-4">
              {activeVehicleDetails.diagram}
            </div>

            <div className="mt-6">
              <span className="font-bold text-slate-900 block mb-3">Suitable for:</span>
              <ul className="space-y-2">
                {activeVehicleDetails.details.suitableFor?.map((item, idx) => (
                  <li key={idx} className="flex items-start text-sm text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mr-2 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <span className="font-bold text-slate-900">Best for: </span>
              <span className="text-sm text-slate-700">{activeVehicleDetails.details.bestFor}</span>
            </div>

            <button
              onClick={() => {
                setSelectedVehicle(activeVehicleDetails)
                setActiveVehicleDetails(null)
                handleGetEstimate()
              }}
              className="w-full mt-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer"
            >
              Proceed to Estimate
            </button>
          </div>
        </div>
      )}

      {/* 2. Vehicle Selector Modal */}
      {vehicleSelectorOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">Choose Two-Wheeler</h3>
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
              {TWO_WHEELER_VEHICLES.map((veh) => {
                const isSelected = selectedVehicle?.id === veh.id
                return (
                  <div
                    key={veh.id}
                    onClick={() => setSelectedVehicle(veh)}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between gap-4 ${
                      isSelected
                        ? "border-emerald-600 bg-emerald-50/40 shadow-sm"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <div className="w-24 h-16 flex items-center justify-center shrink-0">
                      {veh.diagram}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900">{veh.name}</h4>
                        <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                          {veh.capacity}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                        {veh.details.idealFor}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-base font-extrabold text-slate-900">{veh.price}</div>
                      <span className="text-[10px] text-emerald-700 font-semibold">Base fare</span>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex items-center justify-between mb-4">
              <span className="flex items-center gap-1.5 font-medium">
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                Rider arrives in ~10-15 mins
              </span>
              <span className="font-bold text-slate-900">Cash / UPI / Online</span>
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

      {/* ── 2.5 Delivery Date & Slot Stepper Modal (Matching Image 1 & 2) ── */}
      {slotStepperOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] w-full max-w-[1000px] h-[88vh] flex flex-col shadow-2xl overflow-hidden font-sans antialiased border border-slate-100">
            {/* Header (Solid Green #0B8860) */}
            <div className="bg-[#0B8860] text-white pt-5 pb-4 px-6 flex items-center justify-between relative shrink-0">
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
                type="button"
                onClick={() => setSlotStepperOpen(false)}
                className="absolute right-6 top-6 w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-[#F4F5F7] p-4 lg:p-6 gap-6">
              {/* Left Column */}
              <div className="flex-1 flex flex-col overflow-hidden relative bg-white rounded-[20px] shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-100">
                {stepperStep === 3 ? (
                  <>
                    {/* Sub-header for Step 3 */}
                    <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <button
                          type="button"
                          onClick={() => {
                            setSlotStepperOpen(false)
                            setVehicleSelectorOpen(true)
                          }}
                          className="text-slate-400 hover:text-[#0B8860] cursor-pointer"
                        >
                          <ArrowRight className="w-5 h-5 rotate-180" />
                        </button>
                        <h2 className="text-xl font-bold text-slate-800">Confirm your delivery Date & Slot</h2>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto px-6 pb-28 pt-4">
                      {/* Date Selector */}
                      <p className="text-[13px] text-slate-600 mb-3 font-semibold">Select Pickup Date</p>
                      <div className="flex items-center gap-3 overflow-x-auto hide-scrollbar pb-2 mb-6">
                        {DELIVERY_DATES.map((dateObj) => (
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
                        {Object.entries(DELIVERY_SLOTS).map(([timeOfDay, slots]) => {
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
                    <div className="absolute bottom-0 left-0 right-0 bg-white shadow-[0_-8px_20px_rgba(0,0,0,0.04)] px-6 py-4 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setStepperStep(4)}
                        disabled={!selectedDate || !selectedSlot}
                        className="w-full py-3.5 bg-[#0B8860] hover:bg-[#097754] disabled:bg-[#CBD5E1] text-white text-[14px] font-bold rounded-xl transition-all shadow-md shadow-[#0B8860]/20 disabled:shadow-none cursor-pointer disabled:cursor-not-allowed"
                      >
                        Confirm
                      </button>
                    </div>
                  </>
                ) : stepperStep === 4 ? (
                  <>
                    <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <button type="button" onClick={() => setStepperStep(3)} className="text-slate-400 hover:text-[#0B8860] cursor-pointer">
                          <ArrowRight className="w-5 h-5 rotate-180" />
                        </button>
                        <h2 className="text-xl font-bold text-slate-800">Booking Summary</h2>
                      </div>
                      <button type="button" onClick={() => setSupportModalOpen(true)} className="text-[11px] font-bold text-[#0B8860] border border-[#0B8860]/30 bg-[#0B8860]/5 px-3 py-1.5 rounded-full flex items-center gap-1.5 hover:bg-[#0B8860]/10 transition-colors cursor-pointer">
                        <Phone className="w-3.5 h-3.5" /> Get a call
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-32">
                      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-bold text-slate-800 text-base">Movement Details</h3>
                          <button
                            type="button"
                            onClick={() => {
                              setSlotStepperOpen(false)
                              const bar = document.getElementById("estimate-bar")
                              if (bar) bar.scrollIntoView({ behavior: "smooth", block: "center" })
                            }}
                            className="text-[13px] font-bold text-[#0B8860] hover:underline cursor-pointer"
                          >
                            Edit
                          </button>
                        </div>
                        <div className="space-y-4 relative ml-1">
                          <div className="absolute left-[7px] top-[14px] bottom-[14px] w-[1px] bg-slate-200 border-l border-dashed border-slate-300"></div>
                          
                          <div className="flex items-start gap-4 relative bg-white">
                            <div className="mt-0.5 relative z-10 w-4 h-4 bg-white rounded-full flex items-center justify-center">
                              <MapPin className="w-3.5 h-3.5 text-[#0B8860]" />
                            </div>
                            <div className="pt-0.5">
                              <p className="text-[14px] text-slate-800 font-medium leading-relaxed">{pickup || "Hosur Origin"}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-4 relative bg-white">
                            <div className="mt-0.5 relative z-10 w-4 h-4 bg-white rounded-full flex items-center justify-center">
                              <MapPin className="w-3.5 h-3.5 text-rose-500" />
                            </div>
                            <div className="pt-0.5">
                              <p className="text-[14px] text-slate-800 font-medium leading-relaxed">{drop || (selectedRoute ? selectedRoute.to : "Destination")}</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                              <Calendar className="w-4 h-4 text-indigo-600" />
                            </div>
                            <span className="text-[13px] text-slate-700 font-medium">
                              {selectedDate ? `${selectedDate.value} | ` : ""}{selectedSlot || "Time not selected"}
                            </span>
                          </div>
                          <button type="button" onClick={() => setStepperStep(3)} className="text-[13px] font-bold text-slate-500 border border-slate-200 px-4 py-1.5 rounded-full hover:bg-slate-50 transition-colors cursor-pointer">Explore Slots</button>
                        </div>
                      </div>

                      {/* Selected Vehicle Card */}
                      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-20 h-14 flex items-center justify-center bg-slate-50 rounded-xl p-1">
                            {selectedVehicle?.diagram}
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900 text-sm">{selectedVehicle?.name || "Two Wheeler"}</h4>
                            <p className="text-xs text-slate-500 mt-0.5">{selectedVehicle?.capacity || "20 kg capacity"}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSlotStepperOpen(false)
                            setVehicleSelectorOpen(true)
                          }}
                          className="text-[13px] font-bold text-[#0B8860] hover:underline cursor-pointer"
                        >
                          Change
                        </button>
                      </div>
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-100 p-4 shadow-[0_-8px_20px_rgba(0,0,0,0.04)] flex items-center justify-between z-10">
                      <div>
                        <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider mb-0.5">Estimated Fare</p>
                        <p className="text-xl font-black text-slate-800">{selectedVehicle?.price || (selectedRoute ? selectedRoute.fare : "₹ 48")}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (!isSignedIn) {
                            setShowCustomerEntryModal(true)
                          } else {
                            submitBooking()
                          }
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
                    <button
                      type="button"
                      onClick={() => {
                        setSlotStepperOpen(false)
                        const bar = document.getElementById("estimate-bar")
                        if (bar) bar.scrollIntoView({ behavior: "smooth", block: "center" })
                      }}
                      className="text-[12px] font-bold text-[#0B8860] hover:underline cursor-pointer"
                    >
                      Edit
                    </button>
                  </div>
                  
                  <div className="space-y-6 relative ml-1">
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
                      <p className="text-[12px] text-slate-700 font-medium leading-relaxed pt-0.5">{drop || (selectedRoute ? selectedRoute.to : "Destination")}</p>
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
              Booking Requested Successfully!
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
                <span className="font-bold text-slate-900">{selectedVehicle?.name || "2 Wheeler Delivery"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Pickup:</span>
                <span className="font-bold text-slate-900 text-right line-clamp-1">{pickup || "Hosur Area"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Drop:</span>
                <span className="font-bold text-slate-900 text-right line-clamp-1">{drop || "Destination"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Customer:</span>
                <span className="font-bold text-slate-900">{name || "Valued Customer"} (+91 {phone})</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200">
                <span className="text-slate-500 font-medium">Estimated Base Fare:</span>
                <span className="font-extrabold text-emerald-700 text-sm">{selectedVehicle?.price || "₹48"}</span>
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

      {/* 5. Support & Help Center Modal */}
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
          onComplete={() => {
            setShowCustomerEntryModal(false)
            submitBooking()
          }}
        />
      )}
    </div>
  )
}

export default TwoWheelerBookingHosurPage
