import React, { useState, useEffect, useRef, useMemo } from "react"
import { useNavigate, useParams } from "react-router-dom"
import {
  MapPin, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, ArrowRight, ArrowLeft, ShieldCheck,
  Clock, Package, Boxes, X, Sparkles, Navigation, Truck,
  CheckCircle2, Star, Phone, HelpCircle, Loader2, LocateFixed,
  User, Mail, MessageSquare, AlertCircle, Home, Bike, Check,
  ClipboardList, Settings, Zap, Wrench, Search, Plus, Calendar, AlertTriangle, Ban
} from "lucide-react"
import { routes } from "../routes.js"
import { fetchServiceTiers, fetchLanes, fetchServiceAreas, fetchPackersMoversQuote, fetchLogisticsSlots, fetchPackersMoversInventory, fetchGTFaqs, fetchLogisticsCities } from "../../api/logisticsService.js"
import { createBooking, cancelBooking, getBookingStatus } from "../../api/bookingService.js"
import { todayDateString } from "../../components/logistics/LogisticsKit.jsx"
import { SupportHelpCenterModal } from "../components/SupportHelpCenterModal.jsx"
import { useAuth } from "../../state/auth/useAuth.js"
import { CustomerAccountModal } from "./BookingPage.jsx"
import { CustomerEntryFlowModal } from "../components/CustomerEntryFlowModal.jsx"
import { BookingCancellationModal } from "../components/BookingCancellationModal.jsx"
import { BookingRescheduleModal } from "../components/BookingRescheduleModal.jsx"
import { MapPickerScreen } from "../components/AddressPicker/MapPickerScreen.jsx"
import { LogisticsFooter } from "../components/LogisticsFooter.jsx"
import {
  filterLocationSuggestions as filterHosurLocations,
  searchHosurPlacesOnline,
  formatExactLocation,
  isHosurRouteServed,
  resolveLocationCoords,
} from "../../services/hosurLocations.js"

function TierImageFallback({ src, alt, fallback }) {
  const [errored, setErrored] = useState(false)
  if (!src || errored) return fallback
  return (
    <img
      src={src}
      alt={alt}
      onError={() => setErrored(true)}
      className="w-full h-full object-contain"
    />
  )
}

function GenericShiftingDiagram({ className = "w-full h-[120px]" }) {
  return (
    <svg className={className} viewBox="0 0 200 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="120" rx="8" fill="#F8FAFC" />
      <rect x="25" y="42" width="95" height="52" rx="4" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="2" />
      <path d="M120 58H145L158 72V94H120V58Z" fill="#CBD5E1" stroke="#94A3B8" strokeWidth="2" />
      <circle cx="55" cy="95" r="10" fill="#475569" />
      <circle cx="55" cy="95" r="4" fill="#F8FAFC" />
      <circle cx="138" cy="95" r="10" fill="#475569" />
      <circle cx="138" cy="95" r="4" fill="#F8FAFC" />
      <rect x="50" y="24" width="38" height="34" rx="2" fill="#FDE68A" stroke="#D97706" strokeWidth="1.5" />
      <line x1="50" y1="41" x2="88" y2="41" stroke="#D97706" strokeWidth="1.5" strokeDasharray="2 2" />
      <line x1="69" y1="24" x2="69" y2="58" stroke="#D97706" strokeWidth="1.5" strokeDasharray="2 2" />
    </svg>
  )
}

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

function filterIntercitySuggestions(searchText, excludeCityName = "", cityList = null) {
  const source = (cityList && cityList.length > 0) ? cityList : []
  const excludeNormalized = (excludeCityName || "").trim().toLowerCase()
  const availableCities = source.filter((item) => {
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

/* ── Dynamic Category & Subcategory Grouper (Purely Cosmetic Grouping for UI) ── */
/**
 * Cosmetically groups database-loaded GoodsItem records into intuitive subcategories
 * for the UI accordions. Unclassified items cleanly appear in "General Items".
 * Business authority is the GoodsItem database record.
 */
function groupItemsIntoSubcategories(items = []) {
  const groups = {}
  const patterns = [
    { name: "Bed", regex: /\b(bed|cradle|diwan|bunk)\b/i },
    { name: "Mattress", regex: /\bmattress\b/i },
    { name: "Sofa", regex: /\b(sofa|recliner)\b/i },
    { name: "Dining", regex: /\bdining\b/i },
    { name: "Table", regex: /\b(table|desk)\b/i },
    { name: "Chair", regex: /\b(chair|stool|bench|pouffe|bean bag|settee)\b/i },
    { name: "Television", regex: /\b(tv|television|lcd|led)\b/i },
    { name: "Air Conditioner", regex: /\b(ac|air conditioner|cooler)\b/i },
    { name: "Almirah/Wardrobe", regex: /\b(wardrobe|almirah|cupboard|locker)\b/i },
    { name: "Cabinet & Storage", regex: /\b(cabinet|shelf|drawer|unit|rack|trunk|safe)\b/i },
    { name: "Refrigerator", regex: /\b(refrigerator|fridge)\b/i },
    { name: "Washing Machine", regex: /\bwashing\b/i },
    { name: "Kitchen Items", regex: /\b(stove|gas|drum|cylinder)\b/i },
    { name: "Musical Instruments", regex: /\b(piano|guitar|drum|harmonium|tabla|keyboard|synthesizer)\b/i },
    { name: "Cartons & Packaging", regex: /\b(carton|box|bag)\b/i },
    { name: "Appliances", regex: /\b(geyser|purifier|fan|grinder|oven|chimney|microwave|steamer|cooker)\b/i },
  ]

  for (const it of items) {
    let matchedGroup = (it.subcategory || "").trim()
    if (!matchedGroup) {
      for (const p of patterns) {
        if (p.regex.test(it.name)) {
          matchedGroup = p.name
          break
        }
      }
    }
    if (!matchedGroup) matchedGroup = "General Items"
    if (!groups[matchedGroup]) groups[matchedGroup] = []
    groups[matchedGroup].push(it)
  }
  return groups
}

/* ── Dynamic Shifting Dates Helper ── */
const generateUpcomingDates = () => {
  const dates = []
  const today = new Date()

  // For Packers & Movers, same-day move cutoff is typically 18:00
  const isLateNight = today.getHours() >= 18
  const startOffset = isLateNight ? 1 : 0

  for (let i = startOffset; i < startOffset + 7; i++) {
    const nextDate = new Date(today)
    nextDate.setDate(today.getDate() + i)

    let dayName = ""
    if (i === 0) dayName = "Today"
    else if (i === 1) dayName = "Tomorrow"
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
        className={`w-full h-[54px] px-4 rounded-xl border bg-white flex items-center justify-between cursor-pointer transition-all ${isOpen
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
                  className={`w-8 h-8 mx-auto text-xs rounded-xl flex items-center justify-center font-bold transition-all ${isPast
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
export function PackersMoversBookingHosurPage({ city: cityProp, cityName: cityNameProp }) {
  const navigate = useNavigate()
  const { city: routeCityParam } = useParams()
  const currentCitySlug = (cityProp || routeCityParam || "hosur").toLowerCase()
  const defaultCityName = currentCitySlug.charAt(0).toUpperCase() + currentCitySlug.slice(1)
  const [currentCityName, setCurrentCityName] = useState(cityNameProp || defaultCityName)

  const [availableCities, setAvailableCities] = useState([])
  const [selectedCity, setSelectedCity] = useState(defaultCityName.toUpperCase())
  const [mapPickerTarget, setMapPickerTarget] = useState(null)
  const [serverSlotGroups, setServerSlotGroups] = useState(null)

  // Persistent form state for browser Reload / Refresh recovery
  const getSavedForm = () => {
    try {
      const raw = sessionStorage.getItem("sevo_gt_form_packers_movers")
      return raw ? JSON.parse(raw) : {}
    } catch (_) { return {} }
  }
  const savedForm = getSavedForm()

  // Form State
  const [pickup, setPickup] = useState(() => savedForm.pickup || "")
  const [drop, setDrop] = useState(() => savedForm.drop || "")
  const [pickupError, setPickupError] = useState("")
  const [destinationError, setDestinationError] = useState("")

  const [pickupCoords, setPickupCoords] = useState(() => savedForm.pickupCoords || null) // { lat, lng, forAddress }
  const [dropCoords, setDropCoords] = useState(() => savedForm.dropCoords || null)     // { lat, lng, forAddress }

  useEffect(() => {
    try {
      sessionStorage.setItem("sevo_gt_form_packers_movers", JSON.stringify({
        pickup,
        drop,
        pickupCoords,
        dropCoords
      }))
    } catch (_) { }
  }, [pickup, drop, pickupCoords, dropCoords])
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
  const [pmCategories, setPmCategories] = useState([])
  const [maxHelpers, setMaxHelpers] = useState(0)
  const [inventoryLoading, setInventoryLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState("Bedrooms")

  // Track counts as { [itemId]: quantity }
  const [inventoryItems, setInventoryItems] = useState({})

  // Load database-backed P&M inventory categories and items
  useEffect(() => {
    let isMounted = true
    fetchPackersMoversInventory()
      .then(res => {
        if (!isMounted) return
        const cats = res?.categories || res?.data?.categories || []
        setPmCategories(cats)
        const rawMax = res?.max_helpers ?? res?.data?.max_helpers
        const parsedMax = Number(rawMax)
        if (rawMax !== undefined && rawMax !== null && Number.isInteger(parsedMax) && parsedMax >= 0) {
          setMaxHelpers(parsedMax)
        }
        if (cats.length > 0) {
          setActiveCategory(prev => (prev && cats.some(c => c.name === prev) ? prev : cats[0].name))
        }
      })
      .catch(err => {
        console.warn("Could not load database P&M inventory:", err)
      })
      .finally(() => {
        if (isMounted) setInventoryLoading(false)
      })
    return () => { isMounted = false }
  }, [])

  // Fast lookup map: itemId -> item object
  const itemsLookup = React.useMemo(() => {
    const map = {}
    for (const cat of pmCategories) {
      for (const it of (cat.items || [])) {
        map[it.id] = it
      }
    }
    return map
  }, [pmCategories])

  // Track expanded category and subcategory accordions in the UI
  const [expandedSubcategories, setExpandedSubcategories] = useState({})
  const [inventorySearchQuery, setInventorySearchQuery] = useState("")

  // Step 3: Date & Slot State
  const [selectedDate, setSelectedDate] = useState(() => SHIFTING_DATES[0] || null)
  const [serverSlotsAvailability, setServerSlotsAvailability] = useState(null)
  const [serverDates, setServerDates] = useState([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [expandedSlotCategory, setExpandedSlotCategory] = useState("Morning")

  useEffect(() => {
    const dStr = selectedDate?.fullDate ? selectedDate.fullDate.toISOString().split("T")[0] : ""
    const activeCityParam = selectedCity ? selectedCity.toLowerCase() : currentCitySlug
    setSlotsLoading(true)
    fetchLogisticsSlots({ date: dStr, category: "packers_movers", city: activeCityParam })
      .then(res => {
        if (res && res.success) {
          if (Array.isArray(res.upcoming_dates) && res.upcoming_dates.length > 0) {
            const mappedDates = res.upcoming_dates.map(d => ({
              id: d.id,
              date: d.date,
              label: d.label,
              value: d.value,
              fullDate: new Date(`${d.date}T00:00:00`),
              is_today: d.is_today,
            }))
            setServerDates(mappedDates)
            if (!selectedDate) {
              setSelectedDate(mappedDates[0])
            }
          }

          if (res.groups) {
            setServerSlotGroups(res.groups)
            const map = {}
            let firstAvailSlot = null
            let firstAvailGroup = null

            res.groups.forEach(g => {
              (g.slots || []).forEach(s => {
                const sLabel = s.slot || s.label
                map[sLabel] = s.is_available
                if (s.is_available && !firstAvailSlot) {
                  firstAvailSlot = sLabel
                  firstAvailGroup = g.group
                }
              })
            })
            setServerSlotsAvailability(map)

            // Dynamically auto-select the first valid server slot if current selection is null or invalid
            setSelectedSlot(prev => {
              if (prev && map[prev] === true) return prev
              return firstAvailSlot
            })
            setExpandedSlotCategory(prev => {
              if (prev && res.groups.some(g => g.group === prev && g.slots.some(s => s.is_available))) {
                return prev
              }
              return firstAvailGroup || res.groups[0]?.group || "Morning"
            })
          }
        }
      })
      .catch(() => { })
      .finally(() => setSlotsLoading(false))
  }, [selectedDate, selectedCity, currentCitySlug])

  // Booking Flow State
  const [vehicleSelectorOpen, setVehicleSelectorOpen] = useState(false)
  const [selectedPackage, setSelectedPackage] = useState(null)
  const [activePackageDetails, setActivePackageDetails] = useState(null)
  const [bookingSuccessOpen, setBookingSuccessOpen] = useState(false)
  const [supportModalOpen, setSupportModalOpen] = useState(false)
  const [noServiceRoute, setNoServiceRoute] = useState(false)
  const { user } = useAuth()
  const [showAccountPortal, setShowAccountPortal] = useState(false)
  const [showCustomerEntryModal, setShowCustomerEntryModal] = useState(false)
  const [localIsSignedIn, setLocalIsSignedIn] = useState(false)
  const isSignedIn = Boolean(user) || localIsSignedIn

  // Relocation Services & Floor States
  const [pickupFloor, setPickupFloor] = useState(0)
  const [pickupHasLift, setPickupHasLift] = useState(true)
  const [dropFloor, setDropFloor] = useState(0)
  const [dropHasLift, setDropHasLift] = useState(true)
  const [packingTier, setPackingTier] = useState("standard")
  const [dismantlingRequired, setDismantlingRequired] = useState(true)
  const [unpackingRequired, setUnpackingRequired] = useState(false)
  // Extra helpers: 0..maxHelpers, where maxHelpers is the admin setting
  // (PackersMoversConfig.max_helpers) returned by the inventory endpoint.
  const [helpersRequested, setHelpersRequested] = useState(0)
  const [pmServerQuote, setPmServerQuote] = useState(null)
  const [pmQuoteLoading, setPmQuoteLoading] = useState(false)
  const [pmQuoteError, setPmQuoteError] = useState("")
  const bookingAttemptKeyRef = useRef(null)
  const [isSurveySubmittedModalOpen, setIsSurveySubmittedModalOpen] = useState(false)

  const isSurveyRequired = Boolean(
    pmServerQuote && (
      pmServerQuote.requires_survey ||
      pmServerQuote.requires_review ||
      pmServerQuote.survey_status === "SURVEY_REQUIRED" ||
      pmServerQuote.survey_status === "MANUAL_REVIEW_REQUIRED" ||
      pmServerQuote.is_authoritative === false ||
      pmServerQuote.is_estimate === true
    )
  )

  const formatQuoteValidity = (validUntilIso, isSurvey) => {
    if (isSurvey) {
      return "Non-binding estimate (Subject to pre-move survey verification)"
    }
    if (!validUntilIso) {
      return "Authoritative quote"
    }
    try {
      const validDate = new Date(validUntilIso)
      if (isNaN(validDate.getTime())) {
        return "Authoritative quote"
      }
      const now = new Date()
      const diffMinutes = Math.round((validDate.getTime() - now.getTime()) / 60000)
      if (diffMinutes <= 0) {
        return "Authoritative quote • Expired"
      }
      const timeStr = validDate.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
      return `Authoritative quote • Valid until ${timeStr} (${diffMinutes}m remaining)`
    } catch {
      return "Authoritative quote"
    }
  }

  useEffect(() => {
    bookingAttemptKeyRef.current = null
  }, [pickup, drop, inventoryItems, packingTier, pickupFloor, dropFloor, dismantlingRequired, unpackingRequired, helpersRequested])

  // Keep the selection inside the admin limit if it loads/changes later.
  useEffect(() => {
    setHelpersRequested(prev => Math.min(Math.max(0, prev), maxHelpers))
  }, [maxHelpers])

  const refreshPmQuote = async () => {
    const pickupAddressValue = pickup
    const dropAddressValue = drop
    const usableCoords = (coords, address) =>
      coords && coords.forAddress === address && coords.lat != null && coords.lng != null
        ? { lat: Number(coords.lat), lng: Number(coords.lng) }
        : null
    const pickupPoint = usableCoords(pickupCoords, pickupAddressValue)
    const dropPoint = usableCoords(dropCoords, dropAddressValue)

    // Strictly enforce real coordinates -- NO FAKE FALLBACK COORDINATES!
    if (!pickupPoint || !dropPoint) {
      setPmQuoteLoading(false)
      setPmServerQuote(null)
      setPmQuoteError("COORDINATES_REQUIRED: Please select both pickup and drop addresses from suggestions to calculate your quote.")
      return
    }

    setPmQuoteLoading(true)
    setPmQuoteError("")

    // Format inventory items with authoritative goods_item_id
    const formattedInventory = Object.entries(inventoryItems)
      .filter(([_, qty]) => qty > 0)
      .map(([id, qty]) => {
        const itemObj = itemsLookup[id]
        return {
          goods_item_id: Number(id),
          name: itemObj?.name || `Item #${id}`,
          quantity: Number(qty),
        }
      })

    try {
      const res = await fetchPackersMoversQuote({
        pickup: pickupPoint,
        drop: dropPoint,
        inventory: formattedInventory,
        packingTier,
        dismantlingRequired,
        unpackingRequired,
        pickupFloor,
        pickupHasLift,
        dropFloor,
        dropHasLift,
        relocationType,
        city: (selectedCity ? selectedCity.toLowerCase() : currentCitySlug),
        serviceTierId: selectedPackage?._tierId || selectedPackage?.id || null,
      })
      const quoteData = res?.data || res
      if (quoteData && quoteData.quote_id) {
        setPmServerQuote(quoteData)
      } else {
        setPmQuoteError(quoteData?.message || "Failed to calculate relocation quote.")
      }
    } catch (err) {
      console.warn("Failed to fetch PM quote:", err)
      setPmQuoteError("Could not retrieve live price calculation.")
    } finally {
      setPmQuoteLoading(false)
    }
  }

  useEffect(() => {
    if (stepperStep === 4) {
      refreshPmQuote()
    }
  }, [
    stepperStep,
    selectedPackage,
    relocationType,
    packingTier,
    dismantlingRequired,
    unpackingRequired,
    pickupFloor,
    pickupHasLift,
    dropFloor,
    dropHasLift,
  ])


  // Live Dispatch & Polling State
  const [lookingForPartnerOpen, setLookingForPartnerOpen] = useState(false)
  const [partnerCountdown, setPartnerCountdown] = useState(600) // 10:00 mins
  const [orderDetailsExpanded, setOrderDetailsExpanded] = useState(false)
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false)
  const [cancelModalOpen, setCancelModalOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState("")
  const [cancelComments, setCancelComments] = useState("")
  const [cancelSubmitting, setCancelSubmitting] = useState(false)
  const [cancelledBookingModalOpen, setCancelledBookingModalOpen] = useState(false)
  const [cancelledReasonText, setCancelledReasonText] = useState("")
  const [bookingError, setBookingError] = useState("")
  const [bookingSubmitting, setBookingSubmitting] = useState(false)
  const [lastBookingId, setLastBookingId] = useState(null)
  const [lastBookingAmount, setLastBookingAmount] = useState(null)
  const [lastTrackingToken, setLastTrackingToken] = useState(null)
  const [showExitConfirm, setShowExitConfirm] = useState(false)

  // Recover active partner search if user refreshed the page while searching
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("calservice_active_partner_search")
      if (!saved) return
      const parsed = JSON.parse(saved)
      if (parsed?.serviceCategory !== "packers_movers") return
      if (parsed?.bookingId) {
        const ageMs = Date.now() - (parsed.timestamp || 0)
        // Only recover if fresh (< 15 mins)
        if (ageMs < 15 * 60 * 1000) {
          setLastBookingId(parsed.bookingId)
          if (parsed.trackingToken) setLastTrackingToken(parsed.trackingToken)
          if (parsed.amount != null) setLastBookingAmount(parsed.amount)
          setLookingForPartnerOpen(true)

          // Verify with backend immediately
          getBookingStatus(parsed.bookingId, parsed.trackingToken || "").then((res) => {
            if (!res?.data) return
            const status = (res.data.status || "").toLowerCase()
            const isAccepted = Boolean(
              res.data.is_accepted ||
              ["accepted", "on_the_way", "en_route", "arrived", "in_progress"].includes(status)
            )
            if (isAccepted) {
              setLookingForPartnerOpen(false)
              try { sessionStorage.removeItem("calservice_active_partner_search") } catch (e) { }
              const bookingPayload = {
                id: parsed.bookingId,
                request_id: parsed.bookingId,
                tracking_token: parsed.trackingToken,
                ...(res?.data || {})
              }
              navigate(`${routes.booking_checkout}?track=${encodeURIComponent(parsed.bookingId)}`, {
                state: { isTracking: true, successData: bookingPayload }
              })
            } else if (["cancelled", "rejected", "expired", "completed"].includes(status)) {
              setLookingForPartnerOpen(false)
              try { sessionStorage.removeItem("calservice_active_partner_search") } catch (e) { }
              if (["cancelled", "rejected", "expired"].includes(status)) {
                setBookingError("We could not find an available relocation team for your booking. Please try again or schedule for later.")
              }
            }
          }).catch(() => { })
        } else {
          sessionStorage.removeItem("calservice_active_partner_search")
        }
      }
    } catch (e) {
      console.warn("Failed to recover active partner search session:", e)
    }
  }, [navigate])

  const formatCountdown = (sec) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
  }

  // Countdown timer for partner search screen: wall-clock based so it never gets stuck on tab switch
  const COUNTDOWN_TOTAL_SECONDS = 600 // 10:00 mins
  useEffect(() => {
    if (!lookingForPartnerOpen) {
      setPartnerCountdown(COUNTDOWN_TOTAL_SECONDS)
      return
    }

    let startTimestamp = Date.now()
    try {
      const saved = sessionStorage.getItem("calservice_active_partner_search")
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.timestamp && Number(parsed.timestamp) > 0) {
          startTimestamp = Number(parsed.timestamp)
        }
      }
    } catch (_) { }

    const updateCountdown = () => {
      const elapsedSeconds = Math.floor((Date.now() - startTimestamp) / 1000)
      const remaining = Math.max(0, COUNTDOWN_TOTAL_SECONDS - elapsedSeconds)
      setPartnerCountdown(remaining)
      if (remaining <= 0) {
        setLookingForPartnerOpen(false)
        let activeBId = lastBookingId
        let activeToken = lastTrackingToken
        try {
          const saved = sessionStorage.getItem("calservice_active_partner_search")
          if (saved) {
            const parsed = JSON.parse(saved)
            if (!activeBId && parsed.bookingId) activeBId = parsed.bookingId
            if (!activeToken && parsed.trackingToken) activeToken = parsed.trackingToken
          }
          sessionStorage.removeItem("calservice_active_partner_search")
        } catch (_) { }
        if (activeBId) {
          cancelBooking(
            activeBId,
            "Search window expired (no delivery partner found within 10 minutes)",
            activeToken || ""
          ).catch((err) => console.warn("Auto-cancel failed on timeout:", err))
        }
        setBookingError("No relocation team could be assigned within the search window. Please try again or schedule for later.")
      }
    }

    updateCountdown()
    const t = setInterval(updateCountdown, 1000)

    const handleVisibilityOrFocus = () => {
      if (!document.hidden) {
        updateCountdown()
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityOrFocus)
    window.addEventListener("focus", handleVisibilityOrFocus)

    return () => {
      clearInterval(t)
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus)
      window.removeEventListener("focus", handleVisibilityOrFocus)
    }
  }, [lookingForPartnerOpen, lastBookingId, lastTrackingToken])

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
            ["accepted", "on_the_way", "en_route", "arrived", "in_progress"].includes(status)
          )
          if (isAccepted) {
            setLookingForPartnerOpen(false)
            try { sessionStorage.removeItem("calservice_active_partner_search") } catch (e) { }
            const bookingPayload = {
              id: lastBookingId,
              request_id: lastBookingId,
              tracking_token: lastTrackingToken,
              ...(res?.data || {})
            }
            try {
              sessionStorage.setItem("calservice_active_tracking_id", lastBookingId)
              sessionStorage.setItem("calservice_last_booking", JSON.stringify(bookingPayload))
            } catch (e) { }
            navigate(`${routes.booking_checkout}?track=${encodeURIComponent(lastBookingId)}`, {
              state: {
                isTracking: true,
                successData: bookingPayload
              }
            })
          } else if (["cancelled", "rejected", "expired"].includes(status)) {
            setLookingForPartnerOpen(false)
            try { sessionStorage.removeItem("calservice_active_partner_search") } catch (_) { }
            setBookingError("We could not find an available relocation team for your booking. Please try again or schedule for later.")
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

  // ── Comprehensive Browser Navigation (Back / Forward / PopState) ──
  const anyModalOpen = Boolean(
    showExitConfirm ||
    showCustomerEntryModal ||
    mapPickerTarget ||
    inventoryBuilderOpen ||
    vehicleSelectorOpen ||
    activePackageDetails ||
    supportModalOpen ||
    showAccountPortal ||
    isSurveySubmittedModalOpen ||
    cancelModalOpen ||
    cancelledBookingModalOpen
  )

  // Push state when any modal opens to allow Browser Back button to dismiss it
  useEffect(() => {
    if (anyModalOpen || lookingForPartnerOpen) {
      window.history.pushState({ modalOpen: true }, "")
    }
  }, [anyModalOpen, lookingForPartnerOpen])

  const handleBackNavigation = () => {
    if (showExitConfirm) {
      setShowExitConfirm(false)
      return
    }
    if (lookingForPartnerOpen) {
      setShowExitConfirm(true)
      return
    }
    if (showCustomerEntryModal) {
      setShowCustomerEntryModal(false)
      return
    }
    if (mapPickerTarget) {
      setMapPickerTarget(null)
      return
    }
    if (isSurveySubmittedModalOpen) {
      setIsSurveySubmittedModalOpen(false)
      return
    }
    if (activePackageDetails) {
      setActivePackageDetails(null)
      return
    }
    if (inventoryBuilderOpen) {
      if (stepperStep > 2) {
        setStepperStep(prev => prev - 1)
      } else {
        setInventoryBuilderOpen(false)
      }
      return
    }
    if (vehicleSelectorOpen) {
      setVehicleSelectorOpen(false)
      return
    }
    if (supportModalOpen) {
      setSupportModalOpen(false)
      return
    }
    if (showAccountPortal) {
      setShowAccountPortal(false)
      return
    }
    // If no modal is open, navigate to home / previous page
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate(routes.landing)
    }
  }

  useEffect(() => {
    const handlePopState = () => {
      if (showExitConfirm) {
        setShowExitConfirm(false)
        return
      }
      if (lookingForPartnerOpen) {
        setShowExitConfirm(true)
        return
      }
      if (showCustomerEntryModal) {
        setShowCustomerEntryModal(false)
        return
      }
      if (mapPickerTarget) {
        setMapPickerTarget(null)
        return
      }
      if (isSurveySubmittedModalOpen) {
        setIsSurveySubmittedModalOpen(false)
        return
      }
      if (activePackageDetails) {
        setActivePackageDetails(null)
        return
      }
      if (inventoryBuilderOpen) {
        if (stepperStep > 2) {
          setStepperStep(prev => prev - 1)
        } else {
          setInventoryBuilderOpen(false)
        }
        return
      }
      if (vehicleSelectorOpen) {
        setVehicleSelectorOpen(false)
        return
      }
      if (supportModalOpen) {
        setSupportModalOpen(false)
        return
      }
      if (showAccountPortal) {
        setShowAccountPortal(false)
        return
      }
    }

    window.addEventListener("popstate", handlePopState)
    return () => {
      window.removeEventListener("popstate", handlePopState)
    }
  }, [
    showExitConfirm, lookingForPartnerOpen, showCustomerEntryModal,
    mapPickerTarget, inventoryBuilderOpen, stepperStep, vehicleSelectorOpen,
    activePackageDetails, supportModalOpen, showAccountPortal, isSurveySubmittedModalOpen
  ])

  // Prefill user details if signed in — always sanitize to digits-only, max 10
  useEffect(() => {
    let savedPhone = ""
    try { savedPhone = localStorage.getItem("sevo_customer_phone") || "" } catch (_) { }
    if (user || savedPhone) {
      const fullName = user?.full_name || user?.fullName || user?.first_name || user?.firstName || user?.username
      if (fullName && !name) setName(fullName)
      const ph = user?.phone || user?.mobile || user?.mobile_number || savedPhone
      if (ph && !phone) setPhone(ph.replace(/\D/g, "").slice(0, 10))
    }
  }, [user])

  // Suggestions Dropdown State
  const [showPickupSuggestions, setShowPickupSuggestions] = useState(false)
  const [showDropSuggestions, setShowDropSuggestions] = useState(false)
  const [showCityDropdown, setShowCityDropdown] = useState(false)
  const pickupWrapperRef = useRef(null)
  const dropWrapperRef = useRef(null)
  const cityDropdownWrapperRef = useRef(null)

  // Fetch available cities dynamically from backend settings
  useEffect(() => {
    fetchLogisticsCities().then(cities => {
      if (Array.isArray(cities) && cities.length > 0) {
        setAvailableCities(cities)
        const matched = cities.find(c => c.slug === currentCitySlug || (c.name && c.name.toLowerCase() === currentCitySlug))
        if (matched) {
          setSelectedCity(matched.name.toUpperCase())
          setCurrentCityName(matched.name)
        }
      }
    }).catch(() => { })
  }, [currentCitySlug])

  // Live Location Detection State
  const [isDetectingLocation, setIsDetectingLocation] = useState(false)
  const [locationStatus, setLocationStatus] = useState("")




  // FAQ state & dynamic server FAQs
  const [openFaq, setOpenFaq] = useState(null)
  const [serverFaqs, setServerFaqs] = useState([])
  const [faqsLoading, setFaqsLoading] = useState(true)

  useEffect(() => {
    setFaqsLoading(true)
    const activeCityParam = selectedCity ? selectedCity.toLowerCase() : currentCitySlug
    fetchGTFaqs({ category: "packers_movers", city: activeCityParam })
      .then(res => {
        if (Array.isArray(res)) {
          setServerFaqs(res.map(f => ({ q: f.question, a: f.answer })))
        }
      })
      .catch(() => { })
      .finally(() => setFaqsLoading(false))
  }, [selectedCity, currentCitySlug])

  // Catalog data — fetched dynamically from /api/logistics/ for the selected city
  const [fetchedTiers, setFetchedTiers] = useState([])
  const [fetchedLanes, setFetchedLanes] = useState([])
  const [serviceAreas, setServiceAreas] = useState([])

  useEffect(() => {
    let cancelled = false
    const activeCityParam = selectedCity ? selectedCity.toLowerCase() : currentCitySlug
    async function loadCatalog() {
      try {
        const [tiers, lanes, areas] = await Promise.all([
          fetchServiceTiers("packers_movers", activeCityParam),
          fetchLanes("packers_movers", activeCityParam),
          fetchServiceAreas(activeCityParam),
        ])
        if (cancelled) return
        setFetchedTiers(tiers)
        setFetchedLanes(lanes)
        setServiceAreas(areas)
      } catch (err) {
        console.warn("Failed to load logistics catalog:", err)
      }
    }
    loadCatalog()
    return () => { cancelled = true }
  }, [selectedCity, currentCitySlug])

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
      const res = await searchHosurPlacesOnline(drop, currentCityName)
      setOnlineDropSuggestions(res || [])
    }, 250)
    return () => clearTimeout(timer)
  }, [drop, relocationType])

  const intercityCities = useMemo(() => {
    const list = []
    const originCityName = selectedCity || currentCityName || "Hosur"
    const originKey = originCityName.trim().toLowerCase()
    list.push({
      name: originCityName,
      state: "Tamil Nadu",
      subtitle: `${originCityName} (Origin Hub)`,
    })
    const seen = new Set([originKey])
    if (Array.isArray(availableCities) && availableCities.length > 0) {
      availableCities.forEach((c) => {
        if (!c.name) return
        const key = c.name.trim().toLowerCase()
        if (seen.has(key)) return
        seen.add(key)
        list.push({
          name: c.name,
          state: c.state || "",
          subtitle: `${c.state ? `${c.state}` : "Destination"}`,
          lat: c.latitude,
          lng: c.longitude,
        })
      })
    }
    if (Array.isArray(fetchedLanes) && fetchedLanes.length > 0) {
      fetchedLanes.forEach((l) => {
        if (!l.destination_label) return
        const key = l.destination_label.trim().toLowerCase()
        if (seen.has(key)) return
        seen.add(key)
        list.push({
          name: l.destination_label,
          state: (l.destination_label.includes("Bengaluru") || l.destination_label.includes("Electronic City") || l.destination_label.includes("Whitefield")) ? "Karnataka" : "Tamil Nadu",
          subtitle: `${l.distance_km ? `~${Number(l.distance_km)} Kms from ${originCityName}` : ""} ${l.eta_label ? `(${l.eta_label})` : ""}`.trim(),
          distance_km: l.distance_km,
          eta_label: l.eta_label,
          fare: l.fare,
          laneId: l.id,
          _laneId: l.id,
          lat: l.destination_latitude ? Number(l.destination_latitude) : null,
          lng: l.destination_longitude ? Number(l.destination_longitude) : null,
        })
      })
    }
    return list
  }, [availableCities, fetchedLanes, selectedCity])

  const rawPickupSuggestions = relocationType === "Between Cities"
    ? filterIntercitySuggestions(pickup, drop, intercityCities)
    : filterLocationSuggestions(pickup, selectedCity)
  const pickupSuggestions = rawPickupSuggestions

  const rawDropSuggestions = relocationType === "Between Cities"
    ? filterIntercitySuggestions(drop, pickup, intercityCities)
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
            const resolved = formatted || `Current Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`
            setPickup(resolved)
            // Exact device GPS -- the most accurate pickup point we can get.
            setPickupCoords({ lat: latitude, lng: longitude, forAddress: resolved })
          } else {
            const resolved = `Current Location (${currentCityName || "Hosur"} - ${latitude.toFixed(4)}, ${longitude.toFixed(4)})`
            setPickup(resolved)
            setPickupCoords({ lat: latitude, lng: longitude, forAddress: resolved })
          }
          setLocationStatus("Detected")
          setTimeout(() => setLocationStatus(""), 2500)
        } catch (err) {
          // Reverse geocoding failed, but the GPS fix itself is still valid.
          const resolved = `Current Location (${currentCityName || "Hosur"} - ${latitude.toFixed(4)}, ${longitude.toFixed(4)})`
          setPickup(resolved)
          setPickupCoords({ lat: latitude, lng: longitude, forAddress: resolved })
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
      : []

    return {
      id: tier.slug,
      name: tier.name,
      capacity: tier.capacity_label,
      description: tier.description,
      badge: badgeText,
      suitableFor: suitableList,
      price: `₹${Number(tier.starting_price).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`,
      diagram: tier.image
        ? <TierImageFallback src={tier.image} alt={tier.name} fallback={PACKERS_DIAGRAM_BY_SLUG[tier.slug] || <GenericShiftingDiagram />} />
        : (PACKERS_DIAGRAM_BY_SLUG[tier.slug] || <GenericShiftingDiagram />),
      details: {
        name: tier.name,
        capacity: tier.description || "Complete shifting package with professional crew",
        crew: "Professional packing crew + dedicated vehicle",
        materials: "Bubble wrap, corrugated boxes, stretch film & tape included",
        baseFare: `Starts at ₹${Number(tier.starting_price).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`,
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
    destination_latitude: lane.destination_latitude,
    destination_longitude: lane.destination_longitude,
    _laneId: lane.id,
  }))


  const handleGetEstimate = (e) => {
    if (e) e.preventDefault()
    const hasNoPickup = !pickup || !pickup.trim()
    const hasNoDrop = !drop || !drop.trim()

    if (hasNoPickup || hasNoDrop) {
      if (hasNoPickup) {
        setPickupError("Pickup location is not provided")
      } else {
        setPickupError("")
      }
      if (hasNoDrop) {
        setDestinationError("Destination is not provided")
      } else {
        setDestinationError("")
      }
      const targetId = hasNoPickup
        ? (relocationType === "Between Cities" ? "pm-pickup-input-between" : "pm-pickup-input")
        : (relocationType === "Between Cities" ? "pm-drop-input-between" : "pm-drop-input")
      const el = document.getElementById(targetId)
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" })
        el.focus()
      }
      return
    }
    setPickupError("")
    setDestinationError("")

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
  const submitBooking = async (nameOverride = null, phoneOverride = null) => {
    setBookingError("")
    setBookingSubmitting(true)
    try {
      const pkg = selectedPackage || PACKERS_PACKAGES[0]
      const quoteTotal = pmServerQuote?.total != null
        ? Number(pmServerQuote.total)
        : (pmServerQuote?.pricing?.total != null ? Number(pmServerQuote.pricing.total) : null)
      if (!isSurveyRequired && quoteTotal == null) {
        setBookingSubmitting(false)
        setBookingError(
          pmQuoteError ||
          "We couldn't calculate an authoritative relocation quote for this move. Please ensure pickup, drop, and items are selected."
        )
        return
      }
      const fare = quoteTotal || 0
      const quoteId = pmServerQuote?.quote_id || null

      let dateString = todayDateString()
      if (selectedDate && selectedDate.fullDate) {
        const d = selectedDate.fullDate
        dateString = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      }

      const customerEmail = user?.email || (typeof window !== "undefined" ? localStorage.getItem("sevo_customer_email") : "") || ""

      const pickupAddressValue = pickup || ""
      const dropAddressValue = drop || (selectedRoute ? selectedRoute.to : "")
      // Only use a stored coordinate if it was resolved for the address
      // being submitted right now -- see the pickupCoords/dropCoords
      // declaration above for why.
      const usableCoords = (coords, address) =>
        coords && coords.forAddress === address && coords.lat != null && coords.lng != null
          ? { lat: Number(coords.lat), lng: Number(coords.lng) }
          : null
      const pickupPoint = usableCoords(pickupCoords, pickupAddressValue)
      const dropPoint = usableCoords(dropCoords, dropAddressValue)

      const activePickupPoint = pickupPoint
      const activeDropPoint = dropPoint

      // No hardcoded fallback coordinate. A relocation whose pickup we
      // could not pin is refused rather than booked at a made-up point --
      // the crew and vehicle are allocated from that location.
      if (!activePickupPoint) {
        setBookingSubmitting(false)
        setBookingError(
          "We couldn't pin your pickup location. Please pick it from suggestions or the map so we can plan your move."
        )
        return
      }

      let resolvedName = (nameOverride || name || user?.full_name || user?.fullName || user?.first_name || user?.username || "").trim()
      if (!resolvedName && typeof window !== "undefined") {
        try { resolvedName = (localStorage.getItem("sevo_customer_name") || "").trim() } catch (_) { }
      }

      let rawPhone = phoneOverride || phone || user?.phone || user?.mobile || user?.mobile_number || ""
      if (!rawPhone && typeof window !== "undefined") {
        try { rawPhone = localStorage.getItem("sevo_customer_phone") || "" } catch (_) { }
      }
      const cleanPhone = String(rawPhone || "").replace(/\D/g, "").slice(0, 10)

      if (resolvedName && !name) setName(resolvedName)
      if (cleanPhone && !phone) setPhone(cleanPhone)

      if (!resolvedName) {
        setBookingSubmitting(false)
        setShowCustomerEntryModal(true)
        setBookingError("Please sign in or enter your contact name to continue.")
        return
      }

      if (!cleanPhone || cleanPhone.length !== 10) {
        setBookingSubmitting(false)
        setShowCustomerEntryModal(true)
        setBookingError("Please enter a valid 10-digit mobile number.")
        return
      }

      const payload = {
        customer_name: resolvedName,
        phone: cleanPhone,
        email: customerEmail,
        service_category: "packers_movers",
        city: (selectedCity ? selectedCity.toLowerCase() : currentCitySlug),
        issue_title: `Packers & Movers — ${pmServerQuote?.vehicle?.name || pkg.name || "House Shifting"} (${relocationType})`,
        description: `Type: ${userType} | Relocation: ${relocationType} | Volume: ${pmServerQuote?.inventory_summary?.total_cft || 0} CFT`,
        address: pickupAddressValue,
        drop_address: dropAddressValue,
        // Only ever the REAL resolved pickup point -- see the guard above.
        latitude: Number(Number(activePickupPoint.lat).toFixed(6)),
        longitude: Number(Number(activePickupPoint.lng).toFixed(6)),
        preferred_date: dateString,
        preferred_time: selectedSlot || "Morning",
        total_amount: fare,
        payment_method: "COD",
        cart_data: [{
          quote_id: quoteId,
          package: pmServerQuote?.vehicle?.name || pkg.name || "Packers & Movers",
          price: fare,
          route: selectedRoute?.to || null,
          relocation_type: relocationType,
          inventory: Object.entries(inventoryItems)
            .filter(([_, qty]) => qty > 0)
            .map(([id, qty]) => ({
              goods_item_id: Number(id),
              name: itemsLookup[id]?.name || `Item #${id}`,
              quantity: Number(qty),
            })),
          packing_tier: packingTier,
          dismantling_required: dismantlingRequired,
          unpacking_required: unpackingRequired,
          helpers_requested: Math.min(Math.max(0, Number(helpersRequested) || 0), maxHelpers),
          city: selectedCity || "Hosur",
          pickup_floor: pickupFloor,
          pickup_has_lift: pickupHasLift,
          drop_floor: dropFloor,
          drop_has_lift: dropHasLift,
          date: selectedDate?.value,
          slot: selectedSlot
        }],
      }
      // Selected tier must be valid -- NO INVENTED FALLBACK TIER ID (pkg?._tierId || 7)
      const authoritativeTierId = selectedPackage?._tierId || selectedPackage?.id || pkg?._tierId || pkg?.id
      if (!authoritativeTierId) {
        setBookingSubmitting(false)
        setBookingError("Please select a valid relocation package.")
        return
      }
      payload.logistics_tier = authoritativeTierId
      if (selectedRoute?._laneId) payload.logistics_lane = selectedRoute._laneId

      if (!activeDropPoint) {
        setBookingSubmitting(false)
        setBookingError("We couldn't pin your destination location. Please select it from suggestions.")
        return
      }
      payload.drop_latitude = Number(Number(activeDropPoint.lat).toFixed(6))
      payload.drop_longitude = Number(Number(activeDropPoint.lng).toFixed(6))

      if (isSurveyRequired) {
        setIsSurveySubmittedModalOpen(true)
        setBookingSubmitting(false)
        return
      }

      if (!bookingAttemptKeyRef.current) {
        const randStr = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10)
        const uuidStr = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${randStr}`
        bookingAttemptKeyRef.current = `idem_${uuidStr}`
      }
      const attemptKey = bookingAttemptKeyRef.current

      const res = await createBooking(payload, attemptKey)
      // No request_id means the server did not create the booking, whatever
      // status it returned. Treated as a failure rather than papered over.
      const bookingId = res?.data?.request_id || res?.request_id
      if (!bookingId) {
        throw { status: 0, body: { message: "The booking was not confirmed by the server." } }
      }
      bookingAttemptKeyRef.current = null
      const token = res?.data?.tracking_token || res?.tracking_token || null
      const authoritativeAmount = res?.data?.total_amount != null
        ? res.data.total_amount
        : (res?.total_amount != null ? res.total_amount : null)
      setLastBookingId(bookingId)
      setLastBookingAmount(authoritativeAmount)
      setLastTrackingToken(token)
      setInventoryBuilderOpen(false)
      setVehicleSelectorOpen(false)
      setLookingForPartnerOpen(true)
      try {
        sessionStorage.setItem("calservice_active_partner_search", JSON.stringify({
          bookingId,
          trackingToken: token,
          amount: authoritativeAmount,
          serviceCategory: "packers_movers",
          timestamp: Date.now()
        }))
      } catch (e) { }
    } catch (err) {
      if (err?.body?.code === "SURVEY_OR_REVIEW_REQUIRED" || (err?.body?.message && err.body.message.toLowerCase().includes("survey"))) {
        setIsSurveySubmittedModalOpen(true)
        setLookingForPartnerOpen(false)
        return
      }
      // A booking exists only if the backend created the ServiceRequest.
      //
      // This block used to invent a "CRN<12 random digits>" reference, store
      // it as the booking id and open the "looking for a partner" screen --
      // on the FAILURE path. A customer whose booking the server had just
      // rejected was shown a confirmed booking, with a reference number that
      // matched nothing in the database, and then waited for a driver who was
      // never dispatched. Surface the failure instead; never fabricate a
      // booking reference.
      console.error("Booking creation failed:", err)
      let detail = err?.body?.detail
      if (!detail && err?.body?.errors && typeof err.body.errors === "object") {
        const firstField = Object.keys(err.body.errors)[0]
        const firstErr = err.body.errors[firstField]
        detail = Array.isArray(firstErr) ? firstErr[0] : String(firstErr)
      }
      if (!detail) {
        detail =
          err?.body?.message ||
          (err?.status === 401
            ? "Please sign in again to complete this booking."
            : "")
      }
      setBookingError(
        detail ||
        "We couldn't confirm your booking just now. Nothing has been charged — please try again."
      )
      setLookingForPartnerOpen(false)
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
      try { sessionStorage.removeItem("calservice_active_partner_search") } catch (e) { }
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

  const handleItemCount = (itemId, delta) => {
    setInventoryItems(prev => {
      const current = prev[itemId] || 0
      const next = Math.max(0, current + delta)
      if (next === 0) {
        const copy = { ...prev }
        delete copy[itemId]
        return copy
      }
      return {
        ...prev,
        [itemId]: next
      }
    })
  }

  const totalItemsCount = Object.values(inventoryItems).reduce((sum, val) => sum + (Number(val) || 0), 0)

  return (
    <div className="min-h-screen bg-[var(--sevo-bg)] text-[var(--sevo-text-primary)] font-sans antialiased pb-28 lg:pb-0">
      {/* ── Top Header Navigation ─────────────── */}
      <header className="sticky top-0 z-40 bg-[var(--sevo-surface)]/90 backdrop-blur-md border-b border-[var(--sevo-border)] shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleBackNavigation}
              className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 active:scale-95 flex items-center justify-center text-slate-700 transition-all cursor-pointer shrink-0"
              title="Go back"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 cursor-pointer select-none group" onClick={() => navigate(routes.landing)}>
              <img
                src="/assets/sevo_emblem_transparent.png"
                alt="SEVO Emblem"
                className="h-9 w-auto shrink-0 object-contain group-hover:scale-105 transition-transform"
                style={{ height: '36px', width: 'auto' }}
              />
              <div className="flex flex-col">
                <img
                  src="/assets/sevo_text_logo.png"
                  alt="SEVO"
                  className="shrink-0 object-contain"
                  style={{ height: '18px', width: 'auto', maxHeight: '18px' }}
                />
                <span className="text-[10px] font-bold text-[var(--sevo-primary)] tracking-wide uppercase mt-0.5">
                  Packers &amp; Movers
                </span>
              </div>
            </div>
          </div>

          {/* Location Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--sevo-primary-light)] border border-[var(--sevo-primary)]/20 text-xs font-bold text-[var(--sevo-primary)]">
            <MapPin className="w-3.5 h-3.5 text-[var(--sevo-primary)]" />
            <span>{currentCityName || "Hosur"}</span>
          </div>

          <div className="hidden md:flex items-center gap-6 text-sm font-bold text-[var(--sevo-text-secondary)]">
            <span className="hover:text-[var(--sevo-primary)] transition-colors cursor-pointer" onClick={() => navigate(routes.landing)}>Services</span>
            <span className="hover:text-[var(--sevo-primary)] transition-colors cursor-pointer" onClick={() => navigate(routes.landing)}>For Enterprise</span>
            <span className="hover:text-[var(--sevo-primary)] transition-colors cursor-pointer" onClick={() => setSupportModalOpen(true)}>Support</span>
            {user ? (
              <button
                type="button"
                onClick={() => setShowAccountPortal(true)}
                className="flex items-center gap-2 text-[var(--sevo-text-primary)] hover:text-[var(--sevo-primary)] font-bold text-sm transition-colors cursor-pointer group"
              >
                <div className="w-7 h-7 rounded-full border border-[var(--sevo-border)] text-[var(--sevo-text-secondary)] flex items-center justify-center shrink-0 group-hover:border-[var(--sevo-primary)] transition-colors">
                  <User className="w-4 h-4 stroke-[1.75]" />
                </div>
                <span className="font-bold text-[var(--sevo-text-primary)]">
                  {user?.full_name || user?.fullName || user?.first_name || user?.firstName || user?.username || "Customer"}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-[var(--sevo-text-muted)] stroke-[2] shrink-0 group-hover:text-[var(--sevo-text-primary)] transition-colors" />
              </button>
            ) : (
              <button
                onClick={() => setShowCustomerEntryModal(true)}
                className="px-4 py-2 rounded-xl bg-[var(--sevo-primary)] hover:bg-[var(--sevo-primary-hover)] text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
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
              Affordable and Trusted <br className="hidden lg:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-teal-300">Relocation Services</span>
            </h1>

            <p className="text-sm sm:text-[15px] lg:text-base text-slate-200 leading-relaxed mb-8 max-w-2xl mx-auto lg:mx-0 font-medium drop-shadow">
              Whether you're relocating your 1 BHK, 2 BHK, villa, or office across {currentCityName || "Hosur"} and beyond, our verified movers offer safe, hassle-free packing, loading, and on-time delivery.
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
                      className={`flex-1 py-2.5 px-4 text-[14px] font-semibold rounded-full transition-all cursor-pointer ${relocationType === "Within City"
                          ? "bg-[#0B8860] text-white shadow-md"
                          : "text-[#666666] hover:text-[#333333]"
                        }`}
                    >
                      Within City
                    </button>
                    <button
                      type="button"
                      onClick={() => setRelocationType("Between Cities")}
                      className={`flex-1 py-2.5 px-4 text-[14px] font-semibold rounded-full transition-all cursor-pointer ${relocationType === "Between Cities"
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
                            {(availableCities.length > 0
                              ? availableCities.filter(c => c.is_active !== false && c.is_launched !== false).map(c => c.name.toUpperCase())
                              : [selectedCity]
                            ).map((cityName) => (
                              <div
                                key={cityName}
                                className={`px-4 py-3 text-[14px] font-medium cursor-pointer transition-colors ${selectedCity === cityName
                                    ? "bg-[#ecfdf5] text-[#0B8860]"
                                    : "text-[#484848] hover:bg-slate-50"
                                  }`}
                                onClick={() => {
                                  setSelectedCity(cityName)
                                  setCurrentCityName(cityName)
                                  setShowCityDropdown(false)
                                }}
                              >
                                {cityName}
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
                              id="pm-pickup-input"
                              type="text"
                              placeholder={`Enter pickup address or landmark in ${currentCityName || "city"}...`}
                              value={pickup}
                              onFocus={() => { setShowPickupSuggestions(true); setShowDropSuggestions(false); }}
                              onChange={(e) => {
                                setPickup(e.target.value)
                                setPickupCoords(null)
                                setShowPickupSuggestions(true)
                                if (pickupError) setPickupError("")
                              }}
                              className={`w-full h-[54px] pl-4 pr-12 rounded-xl border bg-white text-[15px] outline-none transition-colors placeholder:text-[#999999] ${pickupError
                                  ? "border-rose-500 ring-2 ring-rose-200 bg-rose-50/20 text-slate-800"
                                  : "border-[#E0E0E0] text-[#333333] focus:border-[#0B8860] focus:ring-1 focus:ring-[#0B8860]"
                                }`}
                            />
                            <button
                              type="button"
                              onClick={() => setMapPickerTarget("pickup")}
                              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-[#0B8860] hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                              title="Pick on interactive map"
                            >
                              <MapPin className="w-5 h-5 text-[#0B8860]" />
                            </button>
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
                                      if (pickupError) setPickupError("")
                                      if (loc.lat != null && loc.lng != null) {
                                        setPickupCoords({ lat: loc.lat, lng: loc.lng, forAddress: loc.name })
                                      } else {
                                        setPickupCoords(null)
                                        resolveLocationCoords(loc).then((c) => {
                                          if (c) setPickupCoords({ ...c, forAddress: loc.name })
                                        })
                                      }
                                      setShowPickupSuggestions(false)
                                    }}
                                    className="w-full text-left px-4 py-3 hover:bg-slate-50 text-[14px] font-medium text-[#484848] transition-colors cursor-pointer"
                                  >
                                    {loc.name}
                                  </button>
                                ))}
                              </div>
                            )}
                            {pickupError && (
                              <p className="text-xs font-semibold text-rose-600 mt-1.5 flex items-center gap-1 animate-in fade-in duration-150">
                                <AlertCircle className="w-3.5 h-3.5 inline shrink-0" />
                                <span>{pickupError}</span>
                              </p>
                            )}
                          </div>

                          {/* Drop Input */}
                          <div className="relative" ref={dropWrapperRef}>
                            <div className="absolute -left-[30px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-[2.5px] border-[#0B8860] bg-white"></div>
                            <input
                              id="pm-drop-input"
                              type="text"
                              placeholder={`Enter drop address or landmark in ${currentCityName || "city"}...`}
                              value={drop}
                              onFocus={() => { setShowDropSuggestions(true); setShowPickupSuggestions(false); }}
                              onChange={(e) => {
                                setDrop(e.target.value)
                                setDropCoords(null)
                                setShowDropSuggestions(true)
                                if (destinationError) setDestinationError("")
                              }}
                              className={`w-full h-[54px] pl-4 pr-12 rounded-xl border bg-white text-[15px] outline-none transition-colors placeholder:text-[#999999] ${destinationError
                                  ? "border-rose-500 ring-2 ring-rose-200 bg-rose-50/20 text-slate-800"
                                  : "border-[#E0E0E0] text-[#333333] focus:border-[#0B8860] focus:ring-1 focus:ring-[#0B8860]"
                                }`}
                            />
                            <button
                              type="button"
                              onClick={() => setMapPickerTarget("drop")}
                              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-[#0B8860] hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                              title="Pick on interactive map"
                            >
                              <MapPin className="w-5 h-5 text-emerald-600" />
                            </button>
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
                                      if (destinationError) setDestinationError("")
                                      if (loc.lat != null && loc.lng != null) {
                                        setDropCoords({ lat: loc.lat, lng: loc.lng, forAddress: exact })
                                      } else {
                                        setDropCoords(null)
                                        resolveLocationCoords(loc).then((c) => {
                                          if (c) setDropCoords({ ...c, forAddress: exact })
                                        })
                                      }
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
                            {destinationError && (
                              <p className="text-xs font-semibold text-rose-600 mt-1.5 flex items-center gap-1 animate-in fade-in duration-150">
                                <AlertCircle className="w-3.5 h-3.5 inline shrink-0" />
                                <span>{destinationError}</span>
                              </p>
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
                              id="pm-pickup-input-between"
                              type="text"
                              placeholder="Search Source City"
                              value={pickup}
                              onFocus={() => { setShowPickupSuggestions(true); setShowDropSuggestions(false); }}
                              onChange={(e) => {
                                setPickup(e.target.value)
                                setPickupCoords(null)
                                setShowPickupSuggestions(true)
                                if (pickupError) setPickupError("")
                              }}
                              className={`w-full h-[54px] pl-4 pr-12 rounded-xl border bg-white text-[15px] outline-none transition-colors placeholder:text-[#999999] ${pickupError
                                  ? "border-rose-500 ring-2 ring-rose-200 bg-rose-50/20 text-slate-800"
                                  : "border-[#E0E0E0] text-[#333333] focus:border-[#0B8860] focus:ring-1 focus:ring-[#0B8860]"
                                }`}
                            />
                            <button
                              type="button"
                              onClick={() => setMapPickerTarget("pickup")}
                              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-[#0B8860] hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                              title="Pick on interactive map"
                            >
                              <MapPin className="w-5 h-5 text-[#0B8860]" />
                            </button>
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
                                      if (pickupError) setPickupError("")
                                      if (loc.lat != null && loc.lng != null) {
                                        setPickupCoords({ lat: loc.lat, lng: loc.lng, forAddress: loc.name })
                                      } else {
                                        setPickupCoords(null)
                                        resolveLocationCoords(loc).then((c) => {
                                          if (c) setPickupCoords({ ...c, forAddress: loc.name })
                                        })
                                      }
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
                            {pickupError && (
                              <p className="text-xs font-semibold text-rose-600 mt-1.5 flex items-center gap-1 animate-in fade-in duration-150">
                                <AlertCircle className="w-3.5 h-3.5 inline shrink-0" />
                                <span>{pickupError}</span>
                              </p>
                            )}
                          </div>

                          {/* Drop Input */}
                          <div className="relative" ref={dropWrapperRef}>
                            <div className="absolute -left-[30px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-[2.5px] border-[#0B8860] bg-white"></div>
                            <input
                              id="pm-drop-input-between"
                              type="text"
                              placeholder="Search Destination City"
                              value={drop}
                              onFocus={() => { setShowDropSuggestions(true); setShowPickupSuggestions(false); }}
                              onChange={(e) => {
                                setDrop(e.target.value)
                                setDropCoords(null)
                                setShowDropSuggestions(true)
                                if (destinationError) setDestinationError("")
                              }}
                              className={`w-full h-[54px] pl-4 pr-12 rounded-xl border bg-white text-[15px] outline-none transition-colors placeholder:text-[#999999] ${destinationError
                                  ? "border-rose-500 ring-2 ring-rose-200 bg-rose-50/20 text-slate-800"
                                  : "border-[#E0E0E0] text-[#333333] focus:border-[#0B8860] focus:ring-1 focus:ring-[#0B8860]"
                                }`}
                            />
                            <button
                              type="button"
                              onClick={() => setMapPickerTarget("drop")}
                              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-[#0B8860] hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                              title="Pick on interactive map"
                            >
                              <MapPin className="w-5 h-5 text-emerald-600" />
                            </button>
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
                                      if (destinationError) setDestinationError("")
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
                            {destinationError && (
                              <p className="text-xs font-semibold text-rose-600 mt-1.5 flex items-center gap-1 animate-in fade-in duration-150">
                                <AlertCircle className="w-3.5 h-3.5 inline shrink-0" />
                                <span>{destinationError}</span>
                              </p>
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

                  {/* Validation Error Banner */}
                  {(pickupError || destinationError) && (
                    <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-medium flex items-center justify-between gap-2 animate-in fade-in duration-200 shadow-xs">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>
                          {pickupError && destinationError
                            ? "Pickup location and delivery destination are not provided. Please enter both to proceed."
                            : pickupError
                              ? "Pickup location is not provided. Please enter a pickup location to proceed."
                              : "Destination is not provided. Please enter a delivery destination to proceed."}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const target = document.getElementById(
                            pickupError
                              ? (relocationType === "Between Cities" ? "pm-pickup-input-between" : "pm-pickup-input")
                              : (relocationType === "Between Cities" ? "pm-drop-input-between" : "pm-drop-input")
                          )
                          if (target) {
                            target.scrollIntoView({ behavior: "smooth", block: "center" })
                            target.focus()
                          }
                        }}
                        className="text-rose-700 underline font-bold text-[11px] shrink-0 hover:text-rose-900 cursor-pointer"
                      >
                        {pickupError && destinationError ? "Enter Locations ↑" : pickupError ? "Enter Pickup ↑" : "Enter Destination ↑"}
                      </button>
                    </div>
                  )}

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
            House Shifting Services in {currentCityName || "Hosur"}
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
                    className={`absolute top-3.5 right-3.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border shadow-2xs ${pkg.badge.toLowerCase().includes("coming")
                        ? "bg-amber-100 text-amber-900 border-amber-300 uppercase tracking-wider px-3"
                        : pkg.badge.toLowerCase().includes("popular")
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : pkg.badge.toLowerCase().includes("rare")
                            ? "bg-slate-100 text-slate-700 border-slate-200"
                            : pkg.badge.toLowerCase().includes("best")
                              ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                              : pkg.badge.toLowerCase().includes("trend")
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : "bg-blue-50 text-blue-700 border-blue-200"
                      }`}
                  >
                    {pkg.badge.toLowerCase().includes("coming") ? "" : "★ "}
                    {pkg.badge}
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
                    Starts at <span className="font-bold text-slate-900 text-base">{pkg.price}</span>
                  </p>
                  <p className="text-[11px] text-slate-500 leading-relaxed mt-2 line-clamp-2">
                    {pkg.details.capacity}
                  </p>
                </div>

                {/* Book Button */}
                <div className="w-full mt-5 pt-4 border-t border-slate-100 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPackage(pkg)
                      handleGetEstimate()
                    }}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
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



      {/* ── Section: Popular Relocation Routes ─────────── */}
      {POPULAR_ROUTES.length > 0 && (
        <section className="py-12 sm:py-16 bg-slate-50/80 border-y border-slate-200/60">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Popular Relocation Routes from {currentCityName || "Hosur"}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Complete packing, door-to-door transit, and zero-breakage guarantee across connected corridors
              </p>
            </div>

            <div className="bg-[#F0FDF4]/70 border border-emerald-100 rounded-3xl p-5 sm:p-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {POPULAR_ROUTES.map((route, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      const destination = route.to || ""
                      if (destination) {
                        const exactDrop = formatExactLocation(destination, currentCityName)
                        setDrop(exactDrop)
                        if (route.destination_latitude != null && route.destination_longitude != null) {
                          setDropCoords({
                            lat: Number(route.destination_latitude),
                            lng: Number(route.destination_longitude),
                            forAddress: exactDrop,
                          })
                        } else {
                          setDropCoords(null)
                          resolveLocationCoords(exactDrop, currentCityName).then((c) => {
                            if (c) setDropCoords({ ...c, forAddress: exactDrop })
                          })
                        }
                      }
                      setSelectedRoute(route)
                      const bar = document.getElementById("estimate-bar")
                      if (bar) bar.scrollIntoView({ behavior: "smooth", block: "center" })
                      if (!pickup) {
                        const pickupEl = document.getElementById("pickup-input")
                        if (pickupEl) pickupEl.focus?.()
                      }
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
      )}

      {/* ── Section: Areas We Serve (Uniform Style) ─────── */}
      {HOSUR_AREAS.length > 0 && (
        <section className="py-12 max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mb-6">
            Areas We Serve in {currentCityName || "Hosur"}
          </h2>
          <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 max-w-4xl mx-auto">
            {HOSUR_AREAS.map((area, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  const formatted = formatExactLocation(`${area}, ${currentCityName || "Hosur"}`, currentCityName)
                  setPickup(formatted)
                  setPickupCoords(null)
                  resolveLocationCoords(formatted, currentCityName).then((c) => {
                    if (c) setPickupCoords({ ...c, forAddress: formatted })
                  })
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
      )}

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
            <p className="text-xs text-slate-500">Transparent pricing based on your move details. Larger or complex moves may require a pre-move survey.</p>
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
            onClick={() => navigate(`/trucks/${currentCitySlug || "hosur"}`)}
            className="bg-[#f0f3fa] rounded-3xl p-7 border border-slate-200/60 hover:shadow-lg transition-all cursor-pointer flex flex-col items-center gap-3 group"
          >
            <div className="h-24 flex items-center justify-center">
              <TruckGraphic className="w-28 h-20 group-hover:scale-105 transition-transform" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Trucks &amp; Mini Trucks</h3>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); navigate(`/trucks/${currentCitySlug || "hosur"}`) }}
              className="w-9 h-9 rounded-full bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center shadow-md transition-colors cursor-pointer mt-1"
            >
              <ArrowRight className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* Two Wheelers Card */}
          <div
            onClick={() => navigate(`/two-wheelers/${currentCitySlug || "hosur"}`)}
            className="bg-[#f0f3fa] rounded-3xl p-7 border border-slate-200/60 hover:shadow-lg transition-all cursor-pointer flex flex-col items-center gap-3 group"
          >
            <div className="h-24 flex items-center justify-center">
              <TwoWheelerGraphic className="w-28 h-20 group-hover:scale-105 transition-transform" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Two Wheelers</h3>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); navigate(`/two-wheelers/${currentCitySlug || "hosur"}`) }}
              className="w-9 h-9 rounded-full bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center shadow-md transition-colors cursor-pointer mt-1"
            >
              <ArrowRight className="w-4 h-4 text-white" />
            </button>
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
            {faqsLoading ? (
              <div className="py-8 text-center text-slate-400 text-xs sm:text-sm animate-pulse flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-[#0B8860]" />
                <span>Loading FAQs...</span>
              </div>
            ) : serverFaqs.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-sm bg-slate-50 rounded-2xl border border-slate-100">
                No FAQs currently published for this category.
              </div>
            ) : (
              serverFaqs.map((faq, idx) => (
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
              ))
            )}
          </div>
        </div>
      </section>

      {/* ── Dynamic Logistics Footer ── */}
      <LogisticsFooter
        currentCitySlug={currentCitySlug}
        currentCityName={currentCityName}
        onOpenSupport={() => setSupportModalOpen(true)}
      />

      {/* ── Modals: Package Selector, Login/OTP, Success ── */}

      {/* 2. Package Selector Modal */}
      {vehicleSelectorOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">Choose Shifting Package</h3>
                <p className="text-xs text-slate-500">
                  {pickup || `${currentCityName || "Hosur"} Pickup`} &rarr; {drop || `${currentCityName || "Hosur"} Drop`}
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
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between gap-4 ${isSelected
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
                      <div className="text-[10px] text-slate-500 font-medium">Starts at</div>
                      <div className="text-base font-extrabold text-slate-900">{pkg.price}</div>
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
            {/* A failed booking must be reported to whoever attempted it;
                gating on isSignedIn hid it in exactly the 401 case. */}
            {bookingError && (
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
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-bold mb-1.5 ${stepperStep > s.step ? "bg-white text-[#0B8860]" :
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
                      {pmCategories.map(cat => (
                        <button
                          key={cat.id || cat.name}
                          onClick={() => setActiveCategory(cat.name)}
                          className={`whitespace-nowrap px-4 py-1.5 rounded-full text-[13px] font-semibold transition-all border cursor-pointer ${activeCategory === cat.name
                              ? "bg-[#0B8860] text-white border-[#0B8860]"
                              : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                            }`}
                        >
                          {cat.name}
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
                        {pmCategories.find(c => c.name === activeCategory)?.info_banner || `What we pack in ${activeCategory}`}
                      </div>

                      {/* Subcategories Accordions */}
                      <div className="border border-slate-200 rounded-b-xl overflow-hidden bg-white mb-6">
                        {(() => {
                          const curCat = pmCategories.find(c => c.name === activeCategory) || pmCategories[0]
                          const subGroups = groupItemsIntoSubcategories(curCat?.items || [])
                          return Object.entries(subGroups).map(([subCat, items]) => {
                            // Filter items by search query if any
                            const filteredItems = items.filter(it => it.name.toLowerCase().includes(inventorySearchQuery.toLowerCase()))
                            if (filteredItems.length === 0) return null
                            const isExpanded = !!expandedSubcategories[subCat]
                            const addedCount = filteredItems.reduce((acc, it) => acc + (inventoryItems[it.id] || 0), 0)

                            return (
                              <div key={subCat} className="border-b border-slate-100 last:border-b-0">
                                {/* Accordion Toggle */}
                                <div
                                  onClick={() => setExpandedSubcategories(prev => ({ ...prev, [subCat]: !isExpanded }))}
                                  className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-[13px] text-slate-700">{subCat}</span>
                                    {addedCount > 0 && (
                                      <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 ml-1">
                                        {addedCount} added
                                      </span>
                                    )}
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
                                        const count = inventoryItems[item.id] || 0
                                        return (
                                          <div key={item.id} className="flex items-center justify-between">
                                            <div className="flex flex-col">
                                              <span className="text-[13px] text-slate-600 font-medium">{item.name}</span>
                                              <span className="text-[10px] text-slate-400 font-normal">
                                                {item.configured === false || item.cft == null || item.weight_kg == null ? (
                                                  <span className="text-amber-600 font-medium">Requires Survey / Manual Review</span>
                                                ) : (
                                                  `${item.cft} CFT • ${item.weight_kg} kg`
                                                )}
                                              </span>
                                            </div>
                                            {count > 0 ? (
                                              <div className="flex items-center border border-[#0B8860] rounded-md overflow-hidden text-[#0B8860] bg-white h-8">
                                                <button onClick={() => handleItemCount(item.id, -1)} className="w-8 h-full flex items-center justify-center text-lg font-medium cursor-pointer hover:bg-[#0B8860]/10 transition-colors">-</button>
                                                <span className="font-bold text-sm min-w-[20px] text-center">{count}</span>
                                                <button onClick={() => handleItemCount(item.id, 1)} className="w-8 h-full flex items-center justify-center text-lg font-medium cursor-pointer hover:bg-[#0B8860]/10 transition-colors">+</button>
                                              </div>
                                            ) : (
                                              <button onClick={() => handleItemCount(item.id, 1)} className="w-8 h-8 flex items-center justify-center rounded-md border border-[#0B8860] text-[#0B8860] hover:bg-[#0B8860]/10 transition-colors cursor-pointer bg-white">
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
                          })
                        })()}
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
                          if (!selectedDate) {
                            setSelectedDate((serverDates && serverDates.length > 0) ? serverDates[0] : SHIFTING_DATES[0])
                          }
                          setStepperStep(3)
                        }}
                        disabled={totalItemsCount === 0}
                        className="px-10 py-3 bg-[#0B8860] hover:bg-[#097350] focus:bg-[#097350] text-white text-[14px] font-bold rounded-xl transition-all cursor-pointer disabled:bg-[#CBD5E1] disabled:cursor-not-allowed aria-disabled={totalItemsCount === 0}"
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
                        {((serverDates && serverDates.length > 0) ? serverDates : SHIFTING_DATES).map((dateObj) => (
                          <div
                            key={dateObj.id}
                            onClick={() => setSelectedDate(dateObj)}
                            className={`min-w-[85px] p-3 rounded-xl border flex flex-col items-center justify-center cursor-pointer transition-all ${selectedDate?.id === dateObj.id
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
                        <div className="flex flex-col text-left">
                          <span className="text-[12px] font-bold text-orange-600">Slots Filling Fast, Book Now!</span>
                          {((serverDates && serverDates.length > 0) ? serverDates[0] : SHIFTING_DATES[0])?.label !== "Today" && (
                            <span className="text-[11px] text-orange-700 font-medium mt-0.5">
                              Earliest available move date: {((serverDates && serverDates.length > 0) ? serverDates[0] : SHIFTING_DATES[0])?.label} ({((serverDates && serverDates.length > 0) ? serverDates[0] : SHIFTING_DATES[0])?.value}) — Same-day booking is unavailable as moves require crew &amp; packing preparation.
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Slot Selector */}
                      <p className="text-[13px] text-slate-600 mb-3 font-semibold">Select Pickup Slot</p>
                      {slotsLoading ? (
                        <div className="py-8 text-center text-slate-400 text-xs sm:text-sm animate-pulse flex items-center justify-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin text-[#0B8860]" />
                          <span>Loading available pickup slots...</span>
                        </div>
                      ) : (!serverSlotGroups || serverSlotGroups.length === 0) ? (
                        <div className="p-4 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                          No operating slots available for this date.
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {serverSlotGroups.map((groupObj) => {
                            const timeOfDay = groupObj.group || groupObj.category
                            const slots = groupObj.slots || []
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
                                    {slots.map(slotItem => {
                                      const slot = typeof slotItem === "string" ? slotItem : (slotItem?.slot || slotItem?.label)
                                      const isAvail = typeof slotItem === "object" && slotItem?.is_available != null
                                        ? slotItem.is_available
                                        : (serverSlotsAvailability ? (serverSlotsAvailability[slot] === true) : false)
                                      const passed = !isAvail
                                      return (
                                        <button
                                          key={slot}
                                          type="button"
                                          disabled={passed}
                                          onClick={() => setSelectedSlot(slot)}
                                          className={`py-2 px-1 rounded-xl border text-center transition-all ${selectedSlot === slot
                                              ? "border-[#0B8860] bg-[#0B8860]/5 text-[#0B8860] font-bold shadow-sm"
                                              : passed
                                                ? "border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed pointer-events-none"
                                                : "border-slate-200 bg-white hover:border-slate-300 text-slate-600 font-medium cursor-pointer"
                                            }`}
                                        >
                                          <span className="text-[12px]">{slot}</span>
                                        </button>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    {/* Step 3 Footer */}
                    <div className="absolute bottom-0 left-0 right-0 bg-white shadow-[0_-8px_20px_rgba(0,0,0,0.04)]">
                      {/* Carton Recommendation Banner */}
                      <div className="bg-[#F8F9FA] px-6 py-3 border-t border-slate-100 flex items-start gap-2">
                        <span className="text-lg leading-none">📦</span>
                        {(() => {
                          const cartonCat = pmCategories.find(c => (c.slug && c.slug.includes("carton")) || (c.name && c.name.toLowerCase().includes("carton")))
                          const cartonItems = cartonCat?.items || []
                          const addedCartons = cartonItems.reduce((acc, it) => acc + (inventoryItems[it.id] || 0), 0);
                          return (
                            <p className="text-[11px] text-slate-600 leading-relaxed pt-0.5">
                              You've added {addedCartons} carton{addedCartons !== 1 ? 's' : ''}. Based on your inventory, we estimate you'll need 3 for small items like books and clothes.
                              <span className="text-[#0B8860] font-bold hover:underline cursor-pointer ml-1 inline-block" onClick={() => { setStepperStep(2); setActiveCategory("Cartons") }}>Add 3 Cartons</span>
                            </p>
                          );
                        })()}
                      </div>

                      <div className="px-6 py-4 border-t border-slate-100">
                        <button
                          onClick={() => {
                            setStepperStep(4)
                          }}
                          disabled={!selectedDate || !selectedSlot || (serverSlotsAvailability ? serverSlotsAvailability[selectedSlot] === false : false)}
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

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6 pb-36">
                      {/* Movement & Floor Access Details */}
                      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-bold text-slate-800 text-base">Movement &amp; Floor Access</h3>
                          <button onClick={() => setStepperStep(1)} className="text-[13px] font-bold text-[#0B8860] hover:underline cursor-pointer">Edit Locations</button>
                        </div>
                        <div className="space-y-5 relative ml-1">
                          <div className="absolute left-[7px] top-[14px] bottom-[14px] w-[1px] bg-slate-200 border-l border-dashed border-slate-300"></div>

                          {/* Pickup Floor & Lift */}
                          <div className="flex items-start gap-4 relative bg-white">
                            <div className="mt-0.5 relative z-10 w-4 h-4 bg-white rounded-full flex items-center justify-center">
                              <MapPin className="w-3.5 h-3.5 text-[#0B8860]" />
                            </div>
                            <div className="pt-0.5 flex-1">
                              <p className="text-[14px] text-slate-800 font-semibold leading-relaxed">{pickup || `${currentCityName || "Hosur"} Origin`}</p>
                              <div className="flex flex-wrap items-center gap-4 mt-2.5">
                                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                                  <span>Pickup Floor:</span>
                                  <select
                                    value={pickupFloor}
                                    onChange={(e) => setPickupFloor(Number(e.target.value))}
                                    className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#0B8860]"
                                  >
                                    <option value={0}>Ground Floor</option>
                                    <option value={1}>1st Floor</option>
                                    <option value={2}>2nd Floor</option>
                                    <option value={3}>3rd Floor</option>
                                    <option value={4}>4th Floor</option>
                                    <option value={5}>5th Floor+</option>
                                  </select>
                                </div>
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={pickupHasLift}
                                    onChange={(e) => setPickupHasLift(e.target.checked)}
                                    className="w-3.5 h-3.5 accent-[#0B8860] rounded cursor-pointer"
                                  />
                                  <span className="text-[12px] text-slate-600">Service Lift Available</span>
                                </label>
                              </div>
                            </div>
                          </div>

                          {/* Drop Floor & Lift */}
                          <div className="flex items-start gap-4 relative bg-white">
                            <div className="mt-0.5 relative z-10 w-4 h-4 bg-white rounded-full flex items-center justify-center">
                              <MapPin className="w-3.5 h-3.5 text-rose-500" />
                            </div>
                            <div className="pt-0.5 flex-1">
                              <p className="text-[14px] text-slate-800 font-semibold leading-relaxed">{drop || "Destination"}</p>
                              <div className="flex flex-wrap items-center gap-4 mt-2.5">
                                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                                  <span>Drop Floor:</span>
                                  <select
                                    value={dropFloor}
                                    onChange={(e) => setDropFloor(Number(e.target.value))}
                                    className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#0B8860]"
                                  >
                                    <option value={0}>Ground Floor</option>
                                    <option value={1}>1st Floor</option>
                                    <option value={2}>2nd Floor</option>
                                    <option value={3}>3rd Floor</option>
                                    <option value={4}>4th Floor</option>
                                    <option value={5}>5th Floor+</option>
                                  </select>
                                </div>
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={dropHasLift}
                                    onChange={(e) => setDropHasLift(e.target.checked)}
                                    className="w-3.5 h-3.5 accent-[#0B8860] rounded cursor-pointer"
                                  />
                                  <span className="text-[12px] text-slate-600">Service Lift Available</span>
                                </label>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                              <Calendar className="w-4 h-4 text-indigo-600" />
                            </div>
                            <span className="text-[13px] text-slate-700 font-medium">
                              {selectedDate ? `${selectedDate.fullDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} | ` : ""}{selectedSlot || "Morning Slot"}
                            </span>
                          </div>
                          <button onClick={() => setStepperStep(3)} className="text-[12px] font-bold text-slate-600 border border-slate-200 px-3 py-1 rounded-full hover:bg-slate-50 transition-colors cursor-pointer">Change Slot</button>
                        </div>
                      </div>

                      {/* Packing & Service Customization */}
                      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
                        <h3 className="font-bold text-slate-800 text-base">Packing &amp; Moving Services</h3>

                        {/* Packing Tier Selector */}
                        <div>
                          <p className="text-xs font-semibold text-slate-600 mb-2">Packing Materials &amp; Standards</p>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { id: "standard", label: "Standard Packing", desc: "Multi-layer bubble & foam" },
                              { id: "premium", label: "Premium Fragile", desc: "4-Layer + edge crates" },
                              { id: "no_packing", label: "Customer Packed", desc: "Transport & loading only" },
                            ].map((tier) => (
                              <div
                                key={tier.id}
                                onClick={() => setPackingTier(tier.id)}
                                className={`p-2.5 rounded-xl border text-center cursor-pointer transition-all ${packingTier === tier.id
                                    ? "border-[#0B8860] bg-[#0B8860]/5 text-[#0B8860] shadow-xs"
                                    : "border-slate-200 hover:border-slate-300 text-slate-700"
                                  }`}
                              >
                                <p className="text-xs font-bold">{tier.label}</p>
                                <p className="text-[10px] text-slate-500 mt-0.5">{tier.desc}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Add-on service toggles */}
                        <div className="pt-2 border-t border-slate-100 space-y-2">
                          <label className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                            <div>
                              <p className="text-xs font-bold text-slate-800">Furniture Dismantling &amp; Reassembly</p>
                              <p className="text-[11px] text-slate-500">Beds, wardrobes, and modular dining tables</p>
                            </div>
                            <input
                              type="checkbox"
                              checked={dismantlingRequired}
                              onChange={(e) => setDismantlingRequired(e.target.checked)}
                              className="w-4 h-4 accent-[#0B8860] rounded cursor-pointer"
                            />
                          </label>

                          <label className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                            <div>
                              <p className="text-xs font-bold text-slate-800">Unpacking Assistance at Destination</p>
                              <p className="text-[11px] text-slate-500">Unpack cartons and place goods in respective rooms</p>
                            </div>
                            <input
                              type="checkbox"
                              checked={unpackingRequired}
                              onChange={(e) => setUnpackingRequired(e.target.checked)}
                              className="w-4 h-4 accent-[#0B8860] rounded cursor-pointer"
                            />
                          </label>

                          {maxHelpers > 0 && (
                            <div className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50">
                              <div>
                                <p className="text-xs font-bold text-slate-800">Extra Helpers</p>
                                <p className="text-[11px] text-slate-500">Additional hands for loading &amp; shifting (up to {maxHelpers})</p>
                              </div>
                              <div className="flex items-center gap-2" role="group" aria-label="Extra helpers">
                                <button
                                  type="button"
                                  onClick={() => setHelpersRequested(h => Math.max(0, h - 1))}
                                  disabled={helpersRequested <= 0}
                                  aria-label="Fewer helpers"
                                  className="w-7 h-7 rounded-lg border border-slate-200 text-slate-700 font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:border-[#0B8860]"
                                >
                                  −
                                </button>
                                <span className="w-5 text-center text-sm font-bold text-slate-800" aria-live="polite">{helpersRequested}</span>
                                <button
                                  type="button"
                                  onClick={() => setHelpersRequested(h => Math.min(maxHelpers, h + 1))}
                                  disabled={helpersRequested >= maxHelpers}
                                  aria-label="More helpers"
                                  className="w-7 h-7 rounded-lg border border-slate-200 text-slate-700 font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:border-[#0B8860]"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Added Inventory Summary Accordion */}
                      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center justify-between cursor-pointer hover:border-[#0B8860] transition-colors" onClick={() => setStepperStep(2)}>
                        <div>
                          <h3 className="font-bold text-slate-800 text-sm">
                            Added Inventory: {Object.values(inventoryItems).reduce((a, b) => a + b, 0)} Items
                          </h3>
                          {pmServerQuote?.inventory_summary && (
                            <p className="text-xs text-slate-500 mt-0.5">
                              Estimated Volume: {pmServerQuote.inventory_summary.total_cft} CFT • {pmServerQuote.inventory_summary.fragile_count} Fragile
                            </p>
                          )}
                        </div>
                        <span className="text-xs font-bold text-[#0B8860] hover:underline">Edit Items</span>
                      </div>

                      {/* Survey & Manual Review Alert Banner */}
                      {isSurveyRequired && (
                        <div className="bg-amber-50/95 border border-amber-200 rounded-2xl p-4 text-amber-900 shadow-xs">
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 mt-0.5 text-amber-700">
                              <ClipboardList className="w-5 h-5" />
                            </div>
                            <div className="space-y-1.5 flex-1">
                              <h4 className="font-extrabold text-amber-950 text-sm">Pre-Move Survey Required</h4>
                              <p className="text-xs text-amber-900 font-semibold leading-relaxed">
                                Your move needs a quick assessment because the system needs additional information before confirming the final service and price.
                              </p>
                              <p className="text-[11px] text-amber-800 leading-normal">
                                {pmServerQuote?.estimate_notice || "Due to large volume, uncataloged items, or road routing estimation, the price below is an indicative estimate. Our team will contact you to schedule a quick survey before final price confirmation."}
                              </p>

                              {/* Transparent 6-step workflow roadmap */}
                              <div className="pt-2.5 border-t border-amber-200/80 mt-2">
                                <p className="text-[11px] font-extrabold text-amber-950 uppercase tracking-wider mb-2">What happens next?</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] text-amber-900 font-medium">
                                  <div className="flex items-center gap-1.5">
                                    <span className="w-4 h-4 rounded-full bg-amber-200/80 text-amber-900 font-bold text-[10px] flex items-center justify-center shrink-0">1</span>
                                    <span>Submit move details</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="w-4 h-4 rounded-full bg-amber-200/80 text-amber-900 font-bold text-[10px] flex items-center justify-center shrink-0">2</span>
                                    <span>SEVO reviews &amp; arranges survey</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="w-4 h-4 rounded-full bg-amber-200/80 text-amber-900 font-bold text-[10px] flex items-center justify-center shrink-0">3</span>
                                    <span>Requirements confirmed</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="w-4 h-4 rounded-full bg-amber-200/80 text-amber-900 font-bold text-[10px] flex items-center justify-center shrink-0">4</span>
                                    <span>Final quote provided</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="w-4 h-4 rounded-full bg-amber-200/80 text-amber-900 font-bold text-[10px] flex items-center justify-center shrink-0">5</span>
                                    <span>You review &amp; approve</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="w-4 h-4 rounded-full bg-amber-200/80 text-amber-900 font-bold text-[10px] flex items-center justify-center shrink-0">6</span>
                                    <span>Move is scheduled</span>
                                  </div>
                                </div>
                                <p className="text-[11px] text-emerald-800 font-bold mt-2.5 flex items-center gap-1">
                                  <Check className="w-3.5 h-3.5 text-emerald-700" />
                                  <span>Zero upfront charges — pay only after you approve the final quote.</span>
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Server-Authoritative Price Breakdown */}
                      <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold text-slate-800 text-sm">Price Breakdown</h3>
                          {pmServerQuote?.vehicle && (
                            <span className="text-[11px] font-bold bg-[#0B8860]/10 text-[#0B8860] px-2.5 py-0.5 rounded-full">
                              {pmServerQuote.vehicle.name} ({pmServerQuote.vehicle.crew_size} Movers)
                            </span>
                          )}
                        </div>

                        {pmQuoteLoading ? (
                          <div className="py-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin text-[#0B8860]" />
                            Calculating live relocation fare...
                          </div>
                        ) : pmServerQuote?.pricing ? (
                          <div className="space-y-2 text-xs text-slate-600 pt-1">
                            <div className="flex justify-between">
                              <span>Base Transport &amp; Route ({pmServerQuote.route?.distance_km} km)</span>
                              <span className="font-semibold text-slate-800">₹ {pmServerQuote.pricing.transport_total}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Packing ({pmServerQuote.pricing.packing_label})</span>
                              <span className="font-semibold text-slate-800">₹ {pmServerQuote.pricing.packing_charge}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Loading, Unloading &amp; Floor Labor</span>
                              <span className="font-semibold text-slate-800">₹ {pmServerQuote.pricing.labor_total}</span>
                            </div>
                            {Number(pmServerQuote.pricing.dismantling_charge) > 0 && (
                              <div className="flex justify-between">
                                <span>Furniture Dismantling / Reassembly</span>
                                <span className="font-semibold text-slate-800">₹ {pmServerQuote.pricing.dismantling_charge}</span>
                              </div>
                            )}
                            {Number(pmServerQuote.pricing.unpacking_charge) > 0 && (
                              <div className="flex justify-between">
                                <span>Unpacking Service</span>
                                <span className="font-semibold text-slate-800">₹ {pmServerQuote.pricing.unpacking_charge}</span>
                              </div>
                            )}
                            {pmServerQuote.pricing?.total ? (
                              <>
                                <div className="flex justify-between text-slate-500 pt-1 border-t border-slate-200">
                                  <span>Relocation Base Fare</span>
                                  <span>₹ {pmServerQuote.pricing.subtotal}</span>
                                </div>
                                <div className="flex justify-between text-slate-500">
                                  <span>Taxes (GST 18%)</span>
                                  <span>₹ {pmServerQuote.pricing.gst_amount}</span>
                                </div>
                              </>
                            ) : null}
                            <div className="flex justify-between font-extrabold text-slate-900 text-sm pt-2 border-t border-slate-200">
                              <span>{isSurveyRequired ? "Estimated Moving Fare" : "Total Moving Fare"}</span>
                              <span className={isSurveyRequired ? "text-amber-700 font-black" : "text-[#0B8860]"}>
                                {pmServerQuote.pricing?.total ? `₹ ${pmServerQuote.pricing.total}` : "Survey / Inspection Required"}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 pt-1">
                              Quote Reference: {pmServerQuote.quote_id} • {formatQuoteValidity(pmServerQuote.valid_until, isSurveyRequired)}
                            </p>
                            {!isSurveyRequired && (
                              <p className="text-[10px] text-slate-500 pt-0.5">
                                This fare is calculated from your selected inventory, vehicle, route and service options.
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-rose-500">{pmQuoteError || "Unable to retrieve price calculation."}</p>
                        )}
                      </div>
                    </div>

                    {/* Bottom Action Bar */}
                    <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-100 p-4 shadow-[0_-8px_20px_rgba(0,0,0,0.04)] flex items-center justify-between z-10">
                      <div>
                        <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider mb-0.5">
                          {isSurveyRequired ? "Estimated Fare (Subject to Survey)" : "Your Quoted Price"}
                        </p>
                        <p className="text-xl font-black text-slate-800">
                          {pmServerQuote?.pricing?.total
                            ? `₹ ${Number(pmServerQuote.pricing.total).toLocaleString("en-IN")}`
                            : pmServerQuote?.total
                              ? `₹ ${Number(pmServerQuote.total).toLocaleString("en-IN")}`
                              : (pmQuoteLoading ? "Calculating…" : "Fare unavailable")}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          handleBookNow()
                        }}
                        disabled={bookingSubmitting || pmQuoteLoading || (!isSurveyRequired && !pmServerQuote?.pricing?.total && !pmServerQuote?.total)}
                        className="px-8 py-3.5 bg-[#0B8860] hover:bg-[#097754] text-white text-[15px] font-bold rounded-xl transition-all shadow-md shadow-[#0B8860]/20 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {bookingSubmitting ? "Submitting Request..." : (isSurveyRequired ? "Request Pre-Move Survey" : "Confirm Move")}
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
                      <p className="text-[12px] text-slate-700 font-medium leading-relaxed pt-0.5">{pickup || `${currentCityName || "Hosur"} Origin`}</p>
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

      {/* Pre-Move Survey Request Received Modal */}
      {isSurveySubmittedModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-4">
              <ClipboardList className="w-9 h-9" />
            </div>

            <h3 className="text-xl font-extrabold text-slate-900 mb-2">
              Survey Request Received!
            </h3>
            <p className="text-sm font-semibold text-amber-800 bg-amber-50 py-2.5 px-4 rounded-xl mb-4">
              Your move needs a quick survey before the final price can be confirmed.
            </p>

            <div className="bg-slate-50 rounded-2xl p-4 text-left text-xs space-y-2.5 border border-slate-200 mb-6">
              {pmServerQuote?.quote_id && (
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Quote Reference:</span>
                  <span className="font-bold text-slate-800">{pmServerQuote.quote_id}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Service:</span>
                <span className="font-bold text-slate-900">{selectedPackage?.name || "Packers & Movers"} ({relocationType})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Pickup Address:</span>
                <span className="font-bold text-slate-900 text-right line-clamp-1">{pickup || `${currentCityName || "Hosur"} Area`}</span>
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
                <span className="text-slate-500 font-medium">Estimated Fare:</span>
                <span className="font-bold text-amber-700 text-sm">
                  {pmServerQuote?.pricing?.total
                    ? `₹${Number(pmServerQuote.pricing.total).toLocaleString("en-IN")}`
                    : pmServerQuote?.total
                      ? `₹${Number(pmServerQuote.total).toLocaleString("en-IN")}`
                      : "Pending Survey"} <span className="text-[10px] text-slate-500 font-normal">(Subject to survey)</span>
                </span>
              </div>
            </div>

            <div className="bg-slate-50/80 rounded-xl p-3 text-left text-[11px] text-slate-600 mb-5 space-y-1 border border-slate-100">
              <p className="font-bold text-slate-800">What happens next?</p>
              <p>1. Our relocation coordinator will contact you to schedule a quick video or physical survey.</p>
              <p>2. Once the survey is complete, you will receive your final confirmed price.</p>
              <p>3. No payment is required right now.</p>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsSurveySubmittedModalOpen(false)
                navigate(routes.landing)
              }}
              className="w-full py-3.5 bg-[#0B8860] hover:bg-[#097754] text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer"
            >
              Back to Home
            </button>
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
                <span className="font-bold text-slate-900 text-right line-clamp-1">{pickup || `${currentCityName || "Hosur"} Area`}</span>
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
                <span className="text-slate-500 font-medium">Final Booking Amount:</span>
                <span className="font-extrabold text-emerald-700 text-sm">
                  {lastBookingAmount != null
                    ? `₹${Number(lastBookingAmount).toLocaleString("en-IN")}`
                    : "Amount unavailable"}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              {lastBookingId && (
                <button
                  type="button"
                  onClick={() => {
                    setBookingSuccessOpen(false)
                    navigate(`/track/${encodeURIComponent(lastBookingId)}${lastTrackingToken ? `?token=${encodeURIComponent(lastTrackingToken)}` : ""}`)
                  }}
                  className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer"
                >
                  Track Booking
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setBookingSuccessOpen(false)
                  navigate(routes.landing)
                }}
                className={`py-3.5 ${lastBookingId ? "flex-1 border border-slate-200 text-slate-700 hover:bg-slate-50" : "w-full bg-emerald-600 text-white"} text-xs font-bold rounded-xl transition-all cursor-pointer`}
              >
                Back to Home
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Looking for partner... Screen (Green Logistics Branding) ─────────────── */}
      {lookingForPartnerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[90] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => {
            setLookingForPartnerOpen(false)
            try { sessionStorage.removeItem("calservice_active_partner_search") } catch (_) { }
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 relative overflow-hidden flex flex-col p-6 md:p-8"
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => {
                setLookingForPartnerOpen(false)
                try { sessionStorage.removeItem("calservice_active_partner_search") } catch (_) { }
              }}
              className="absolute right-5 top-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 cursor-pointer transition-colors z-20"
              title="Close and return to page"
            >
              <X className="w-4 h-4" />
            </button>

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
              <div className="border border-slate-200 rounded-2xl overflow-hidden mb-6 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setOrderDetailsExpanded(!orderDetailsExpanded)}
                  className="w-full p-3.5 bg-slate-50/70 hover:bg-slate-50 flex items-center justify-between text-left cursor-pointer transition-colors"
                >
                  <div>
                    <p className="text-xs font-extrabold text-slate-900">Order Details</p>
                    <p className="text-[11px] text-slate-500 font-bold mt-0.5">{lastBookingId || "—"}</p>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${orderDetailsExpanded ? "rotate-180" : ""}`} />
                </button>

                {orderDetailsExpanded && (
                  <div className="p-4 bg-white border-t border-slate-100 space-y-3">
                    {/* Pickup */}
                    <div className="flex items-start gap-3">
                      <div className="mt-1 w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800">{name || "Customer"} • {phone || "Enter phone number"}</p>
                        <p className="text-xs text-slate-500 leading-snug mt-0.5">{pickup || "Select pickup location"}</p>
                      </div>
                    </div>
                    <div className="ml-[4px] w-[2px] h-3 bg-slate-300 border-l-2 border-dashed border-slate-400" />
                    {/* Drop */}
                    <div className="flex items-start gap-3">
                      <div className="mt-1 w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800">{name || "Customer"} • {phone || "Enter phone number"}</p>
                        <p className="text-xs text-slate-500 leading-snug mt-0.5">{drop || (selectedRoute ? selectedRoute.to : "Select destination")}</p>
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
                        <span className="text-base">💵</span> Amount Payable
                      </div>
                      <span className="text-sm font-extrabold text-slate-900">
                        {lastBookingAmount != null
                          ? `₹${Number(lastBookingAmount).toLocaleString("en-IN")}`
                          : (pmServerQuote?.total != null
                            ? `₹${Number(pmServerQuote.total).toLocaleString("en-IN")}`
                            : "Amount unavailable")}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons: Close Search, Reschedule, or Cancel */}
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setLookingForPartnerOpen(false)
                  try { sessionStorage.removeItem("calservice_active_partner_search") } catch (_) { }
                }}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs sm:text-sm transition-colors cursor-pointer"
              >
                Close Search
              </button>
              <button
                type="button"
                onClick={() => setRescheduleModalOpen(true)}
                className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reschedule
              </button>
              <button
                type="button"
                onClick={() => {
                  setCancelReason("")
                  setCancelComments("")
                  setCancelModalOpen(true)
                }}
                className="flex-1 py-3 rounded-xl border border-rose-200 bg-rose-50/70 text-rose-700 hover:bg-rose-100 font-bold text-xs sm:text-sm transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Ban className="w-3.5 h-3.5" />
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reschedule Booking Modal ── */}
      {rescheduleModalOpen && (
        <BookingRescheduleModal
          bookingId={lastBookingId}
          currentDate={preferredDate || (selectedDate?.fullDate ? selectedDate.fullDate.toLocaleDateString("en-CA") : "")}
          currentTimeSlot={selectedSlot || "Morning"}
          onClose={() => setRescheduleModalOpen(false)}
          onRescheduled={({ new_date, new_time_slot }) => {
            setPreferredDate(new_date)
            setSelectedSlot(new_time_slot)
            setRescheduleModalOpen(false)
          }}
        />
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
              Your booking <strong className="text-slate-900 font-extrabold">#{lastBookingId || "—"}</strong> has been cancelled.
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
                  try { sessionStorage.removeItem("calservice_active_partner_search") } catch (e) { }
                  const bookingPayload = {
                    id: lastBookingId,
                    request_id: lastBookingId,
                    tracking_token: lastTrackingToken
                  }
                  try {
                    sessionStorage.setItem("calservice_active_tracking_id", lastBookingId)
                    sessionStorage.setItem("calservice_last_booking", JSON.stringify(bookingPayload))
                  } catch (e) { }
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
          onSuccess={(userData) => {
            setShowCustomerEntryModal(false)
            setLocalIsSignedIn(true)
            const resolvedName = (userData?.name || name || "").trim()
            const resolvedPhone = (userData?.phone || phone || "").replace(/\D/g, "").slice(0, 10)
            if (resolvedName) setName(resolvedName)
            if (resolvedPhone) setPhone(resolvedPhone)
            submitBooking(resolvedName, resolvedPhone)
          }}
          onComplete={(userData) => {
            setShowCustomerEntryModal(false)
            setLocalIsSignedIn(true)
            const resolvedName = (userData?.name || name || "").trim()
            const resolvedPhone = (userData?.phone || phone || "").replace(/\D/g, "").slice(0, 10)
            if (resolvedName) setName(resolvedName)
            if (resolvedPhone) setPhone(resolvedPhone)
            submitBooking(resolvedName, resolvedPhone)
          }}
        />
      )}

      {/* Interactive Map Picker Modal */}
      {mapPickerTarget && (
        <MapPickerScreen
          initialCoords={
            mapPickerTarget === "pickup"
              ? (pickupCoords?.lat ? { lat: Number(pickupCoords.lat), lng: Number(pickupCoords.lng) } : null)
              : (dropCoords?.lat ? { lat: Number(dropCoords.lat), lng: Number(dropCoords.lng) } : null)
          }
          serviceSlug="packers_movers"
          onClose={() => setMapPickerTarget(null)}
          onConfirm={(resolvedAddr) => {
            const fullAddr = resolvedAddr?.formatted_address || resolvedAddr?.address || resolvedAddr?.name || "Selected Location"
            const lat = Number(resolvedAddr?.latitude ?? resolvedAddr?.lat)
            const lng = Number(resolvedAddr?.longitude ?? resolvedAddr?.lng)
            if (mapPickerTarget === "pickup") {
              setPickup(fullAddr)
              if (pickupError) setPickupError("")
              if (!isNaN(lat) && !isNaN(lng)) {
                setPickupCoords({ lat, lng, forAddress: fullAddr })
              }
            } else {
              setDrop(fullAddr)
              if (destinationError) setDestinationError("")
              if (!isNaN(lat) && !isNaN(lng)) {
                setDropCoords({ lat, lng, forAddress: fullAddr })
              }
            }
            setMapPickerTarget(null)
          }}
        />
      )}
    </div>
  )
}

export default PackersMoversBookingHosurPage
