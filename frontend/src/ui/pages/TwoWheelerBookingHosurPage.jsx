import React, { useState, useEffect, useRef } from "react"
import { useNavigate, useParams } from "react-router-dom"
import {
  MapPin, ChevronDown, ChevronUp, ArrowRight, ArrowLeft, ShieldCheck,
  Clock, Package, Boxes, X, Sparkles, Navigation, Truck,
  CheckCircle2, Star, Phone, HelpCircle, Loader2, LocateFixed,
  User, Mail, MessageSquare, AlertCircle, Bike, Check, Zap, Calendar, Ban, RefreshCw
} from "lucide-react"
import { routes } from "../routes.js"
import { extractApiErrorMessage } from "../../api/client.js"
import { fetchServiceTiers, fetchLanes, fetchServiceAreas, fetchLogisticsQuote, checkRouteCoverage, checkPointCoverage, fetchGoodsCategories, fetchGoodsItems, fetchLogisticsSlots, evaluateCargoFitment, fetchGTFaqs, fetchLogisticsCities } from "../../api/logisticsService.js"
import { GoodsCargoSelectorModal } from "../../components/logistics/GoodsCargoSelectorModal.jsx"
import { MultiStopRouteManager, findUnpinnedStop, locatedStops, coverageIssueForStops } from "../../components/logistics/MultiStopRouteManager.jsx"
import { parseDimensionLabel, tierCapacityText, tierBadgeText } from "../../components/logistics/tierDisplay.js"
import { createBooking, cancelBooking, getBookingStatus } from "../../api/bookingService.js"
import { apiRequestCustomerPhoneOTP, apiVerifyCustomerPhoneOTP } from "../../api/authService.js"
import { verifyOtpViaWebSocket } from "../../api/websocketService.js"
import { todayDateString } from "../../components/logistics/LogisticsKit.jsx"
import { SupportHelpCenterModal } from "../components/SupportHelpCenterModal.jsx"
import { useAuth } from "../../state/auth/useAuth.js"
import { CustomerAccountModal } from "./BookingPage.jsx"
import { CustomerEntryFlowModal } from "../components/CustomerEntryFlowModal.jsx"
import { BookingCancellationModal } from "../components/BookingCancellationModal.jsx"
import { BookingRescheduleModal } from "../components/BookingRescheduleModal.jsx"
import { MapPickerScreen } from "../components/AddressPicker/MapPickerScreen.jsx"
import { LogisticsFooter } from "../components/LogisticsFooter.jsx"
import { getAddress } from "../../api/geocoding.js"
import {
  filterLocationSuggestions,
  searchHosurPlacesOnline,
  formatExactLocation,
  resolveLocationCoords,
} from "../../services/hosurLocations.js"

function GenericTwoWheelerDiagram({ className = "w-full max-w-[240px] h-[120px]" }) {
  return (
    <svg viewBox="0 0 260 130" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="260" height="130" rx="12" fill="#F8FAFC" />
      <circle cx="75" cy="85" r="22" stroke="#059669" strokeWidth="4" fill="#F1F5F9" />
      <circle cx="75" cy="85" r="8" fill="#334155" />
      <circle cx="185" cy="85" r="22" stroke="#059669" strokeWidth="4" fill="#F1F5F9" />
      <circle cx="185" cy="85" r="8" fill="#334155" />
      <path d="M75 85L110 85L135 60L165 60L185 85" stroke="#047857" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M110 85L130 50L145 50" stroke="#047857" strokeWidth="4" strokeLinecap="round" />
      <rect x="85" y="45" width="28" height="22" rx="3" fill="#0F172A" />
      <path d="M165 60L155 35L170 35" stroke="#334155" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/* ── 2 Wheeler Dimension Diagram matching user screenshot (40cm x 40cm box on bike) ── */
function TwoWheelerDimensionDiagram({ className = "w-full max-w-[240px] h-[120px]", dims = null }) {
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
      {dims?.left && <text x="2" y="58" fill="#475569" fontSize="11" fontWeight="700" fontFamily="system-ui, sans-serif" textAnchor="start">{dims.left}</text>}
      <line x1="28" y1="36" x2="28" y2="76" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="3 2" />
      <line x1="24" y1="36" x2="32" y2="36" stroke="#64748b" strokeWidth="1.5" />
      <line x1="24" y1="76" x2="32" y2="76" stroke="#64748b" strokeWidth="1.5" />

      {/* Width Dimension for Box (Top: 40cm) */}
      {dims?.top && <text x="80" y="24" fill="#475569" fontSize="14" fontWeight="700" fontFamily="system-ui, sans-serif" textAnchor="middle">{dims.top}</text>}
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

// Attach the tier's admin-configured dimensions to its artwork (numbers are
// never baked into the drawings).
function withDims(diagram, dims) {
  return diagram ? React.cloneElement(diagram, { dims }) : diagram
}

const TWO_WHEELER_DIAGRAM_BY_SLUG = {
  "2-wheeler": <TwoWheelerDimensionDiagram />,
  "2-wheeler-electric-express": <TwoWheelerDimensionDiagram />,
}

function TierImageFallback({ src, alt, fallback }) {
  const [imgError, setImgError] = useState(false)
  if (!src || imgError) return fallback
  return (
    <img
      src={src}
      alt={alt}
      onError={() => setImgError(true)}
      className="w-full max-w-[240px] h-[120px] object-contain"
    />
  )
}

/* ── Dynamic Upcoming Dates Helper ── */
const generateUpcomingDates = () => {
  const dates = []
  const today = new Date()

  // Start today (or tomorrow if past operating cutoff at 21:00)
  const isLateNight = today.getHours() >= 21
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

const DELIVERY_DATES = generateUpcomingDates()

/* ── Two-Wheeler Booking in Hosur Page ── */
export function TwoWheelerBookingHosurPage({ city: cityProp, cityName: cityNameProp }) {
  const navigate = useNavigate()
  const { city: routeCityParam } = useParams()
  const [availableCities, setAvailableCities] = useState([])
  const [mapPickerTarget, setMapPickerTarget] = useState(null)
  const currentCitySlug = (cityProp || routeCityParam || "hosur").toLowerCase()
  const defaultCityName = currentCitySlug.charAt(0).toUpperCase() + currentCitySlug.slice(1)
  const [currentCityName, setCurrentCityName] = useState(cityNameProp || defaultCityName)

  useEffect(() => {
    let isMounted = true
    fetchLogisticsCities()
      .then(res => {
        if (!isMounted) return
        const cities = Array.isArray(res) ? res : (res?.results || res?.data || [])
        setAvailableCities(cities)
        const matched = cities.find(c => c.slug === currentCitySlug || c.name?.toLowerCase() === currentCitySlug)
        if (matched?.name) {
          setCurrentCityName(matched.name)
        }
      })
      .catch(() => { })
    return () => { isMounted = false }
  }, [currentCitySlug])

  // Persistent form state for browser Reload / Refresh recovery
  const getSavedForm = () => {
    try {
      const raw = sessionStorage.getItem("sevo_gt_form_two_wheeler")
      return raw ? JSON.parse(raw) : {}
    } catch (_) { return {} }
  }
  const savedForm = getSavedForm()

  // Form State
  const [pickup, setPickup] = useState(() => savedForm.pickup || "")
  const [drop, setDrop] = useState(() => savedForm.drop || "")
  const [pickupCoords, setPickupCoords] = useState(() => savedForm.pickupCoords || null)
  const [dropCoords, setDropCoords] = useState(() => savedForm.dropCoords || null)

  useEffect(() => {
    try {
      sessionStorage.setItem("sevo_gt_form_two_wheeler", JSON.stringify({
        pickup,
        drop,
        pickupCoords,
        dropCoords
      }))
    } catch (_) { }
  }, [pickup, drop, pickupCoords, dropCoords])
  const [serverQuote, setServerQuote] = useState(null)
  const [quoteLoading, setQuoteLoading] = useState(false)
  const [quoteError, setQuoteError] = useState("")
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [receiverName, setReceiverName] = useState("")
  const [receiverPhone, setReceiverPhone] = useState("")
  const [receiverPhoneError, setReceiverPhoneError] = useState("")
  const [showReceiverDetails, setShowReceiverDetails] = useState(false)
  const [userType, setUserType] = useState("Personal Parcels & Documents")
  const [selectedRoute, setSelectedRoute] = useState(null)

  // Booking Flow State
  const [vehicleSelectorOpen, setVehicleSelectorOpen] = useState(false)
  const [selectedVehicle, setSelectedVehicle] = useState(null)
  const [slotStepperOpen, setSlotStepperOpen] = useState(false)
  const [stepperStep, setStepperStep] = useState(3)
  const [bookingMode, setBookingMode] = useState("IMMEDIATE") // "IMMEDIATE" | "SCHEDULED"
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [expandedSlotCategory, setExpandedSlotCategory] = useState("Morning")

  useEffect(() => {
    bookingAttemptKeyRef.current = null
  }, [pickup, drop, selectedVehicle, bookingMode])
  const [bookingSuccessOpen, setBookingSuccessOpen] = useState(false)
  const [supportModalOpen, setSupportModalOpen] = useState(false)
  const [noServiceRoute, setNoServiceRoute] = useState(false)
  // Service Coverage (admin-configured ServiceZones): pickup/drop-specific
  // reason when the trip is outside ACTIVE coverage; "" when covered.
  const [coverageMessage, setCoverageMessage] = useState("")
  const { user } = useAuth()
  const [showAccountPortal, setShowAccountPortal] = useState(false)
  const [showCustomerEntryModal, setShowCustomerEntryModal] = useState(false)
  const [localIsSignedIn, setLocalIsSignedIn] = useState(false)
  const isSignedIn = Boolean(user) || localIsSignedIn

  // Goods Type & Looking for Partner Flow State (Database-Backed Catalog)
  const [lookingForPartnerOpen, setLookingForPartnerOpen] = useState(false)
  const [selectedGoodsType, setSelectedGoodsType] = useState("General Goods")
  const [dynamicCategories, setDynamicCategories] = useState([])
  const [selectedGoodsCategoryObj, setSelectedGoodsCategoryObj] = useState(null)
  const [cargoItems, setCargoItems] = useState([])
  const [cargoSelectorOpen, setCargoSelectorOpen] = useState(false)
  const [intermediateStops, setIntermediateStops] = useState([])
  // Set when a stop is outside service coverage (see the coverage check below).
  const [stopCoverageIssue, setStopCoverageIssue] = useState(null)
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [catalogError, setCatalogError] = useState("")
  const [goodsTypeModalOpen, setGoodsTypeModalOpen] = useState(false)
  const COUNTDOWN_TOTAL_SECONDS = 598 // 9:58 mins
  const [partnerCountdown, setPartnerCountdown] = useState(COUNTDOWN_TOTAL_SECONDS)
  const [orderDetailsExpanded, setOrderDetailsExpanded] = useState(true)
  const [lastBookingId, setLastBookingId] = useState(null)
  const [lastTrackingToken, setLastTrackingToken] = useState(null)
  const [lastBookingAmount, setLastBookingAmount] = useState(null)

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
        setBookingError("No delivery partner could be assigned within the search window. Please try again or schedule for later.")
      }
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)

    const handleVisibilityOrFocus = () => {
      if (!document.hidden) {
        updateCountdown()
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityOrFocus)
    window.addEventListener("focus", handleVisibilityOrFocus)

    return () => {
      clearInterval(interval)
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus)
      window.removeEventListener("focus", handleVisibilityOrFocus)
    }
  }, [lookingForPartnerOpen, lastBookingId, lastTrackingToken])



  const formatCountdown = (secs) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s < 10 ? "0" : ""}${s}`
  }

  // Inline phone error state
  const [phoneError, setPhoneError] = useState("")

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
  const pickupWrapperRef = useRef(null)
  const dropWrapperRef = useRef(null)
  const bookingAttemptKeyRef = useRef(null)

  // Live Location Detection State
  const [isDetectingLocation, setIsDetectingLocation] = useState(false)
  const [locationStatus, setLocationStatus] = useState("")

  // Details Modal
  const [activeVehicleDetails, setActiveVehicleDetails] = useState(null)

  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false)
  const [cancelModalOpen, setCancelModalOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState("")
  const [cancelComments, setCancelComments] = useState("")
  const [cancelSubmitting, setCancelSubmitting] = useState(false)
  const [cancelledBookingModalOpen, setCancelledBookingModalOpen] = useState(false)
  const [cancelledReasonText, setCancelledReasonText] = useState("")

  // Lock body scroll when any modal or drawer is open to freeze background
  const isAnyModalOpen = Boolean(
    mapPickerTarget ||
    activeVehicleDetails ||
    vehicleSelectorOpen ||
    goodsTypeModalOpen ||
    lookingForPartnerOpen ||
    cancelModalOpen ||
    cancelledBookingModalOpen ||
    slotStepperOpen ||
    bookingSuccessOpen ||
    supportModalOpen ||
    showAccountPortal ||
    showCustomerEntryModal
  )

  useEffect(() => {
    if (isAnyModalOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => { document.body.style.overflow = "" }
  }, [isAnyModalOpen])

  // FAQ state & dynamic server FAQs
  const [openFaq, setOpenFaq] = useState(null)
  const [serverFaqs, setServerFaqs] = useState([])
  const [faqsLoading, setFaqsLoading] = useState(true)

  useEffect(() => {
    setFaqsLoading(true)
    fetchGTFaqs({ category: "two_wheeler", city: currentCityName || currentCitySlug })
      .then(res => {
        if (Array.isArray(res)) {
          setServerFaqs(res.map(f => ({ q: f.question, a: f.answer })))
        }
      })
      .catch(() => { })
      .finally(() => setFaqsLoading(false))
  }, [currentCityName, currentCitySlug])

  // Catalog data — fetched from /api/logistics/ (backend/logistics app),
  // replacing what used to be hardcoded TWO_WHEELER_VEHICLES/POPULAR_ROUTES/
  // HOSUR_AREAS arrays.
  const [fetchedTiers, setFetchedTiers] = useState([])
  const [fetchedLanes, setFetchedLanes] = useState([])
  const [serviceAreas, setServiceAreas] = useState([])
  const [pickupError, setPickupError] = useState("")
  const [destinationError, setDestinationError] = useState("")
  const [bookingError, setBookingError] = useState("")
  const [bookingSubmitting, setBookingSubmitting] = useState(false)
  const [showExitConfirm, setShowExitConfirm] = useState(false)
  const [serverSlotsAvailability, setServerSlotsAvailability] = useState(null)
  const [serverSlotGroups, setServerSlotGroups] = useState(null)
  const [serverDates, setServerDates] = useState([])
  const [slotsLoading, setSlotsLoading] = useState(false)

  useEffect(() => {
    const dStr = selectedDate?.fullDate ? selectedDate.fullDate.toISOString().split("T")[0] : ""
    setSlotsLoading(true)
    fetchLogisticsSlots({ date: dStr, category: "goods_transport_two_wheeler", city: currentCitySlug })
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
  }, [selectedDate, currentCitySlug])

  // Recover active in-flight partner search if customer refreshes the page
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("calservice_active_partner_search")
      if (saved) {
        const parsed = JSON.parse(saved)
        const isFresh = Date.now() - (parsed.timestamp || 0) < 15 * 60 * 1000
        if (isFresh && parsed.bookingId && parsed.serviceCategory === "goods_transport_two_wheeler") {
          setLastBookingId(parsed.bookingId)
          if (parsed.trackingToken) setLastTrackingToken(parsed.trackingToken)
          if (parsed.amount != null) setLastBookingAmount(parsed.amount)
          setLookingForPartnerOpen(true)
        } else if (!isFresh) {
          sessionStorage.removeItem("calservice_active_partner_search")
        }
      }
    } catch (e) { }
  }, [])

  useEffect(() => {
    if (!lookingForPartnerOpen || !lastBookingId) return

    let pollInterval = null
    let isMounted = true
    let isFetching = false

    const checkStatus = async () => {
      if (isFetching) return          // skip cycle if previous request still in-flight
      isFetching = true
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
            try {
              sessionStorage.removeItem("calservice_active_partner_search")
            } catch (e) { }
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
            try {
              sessionStorage.removeItem("calservice_active_partner_search")
            } catch (_) { }
            setBookingError("We could not find an available delivery partner for your booking. Please try again or schedule for later.")
          }
        }
      } catch (e) {
        console.warn("Failed to poll booking status:", e)
      } finally {
        isFetching = false
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
    cargoSelectorOpen ||
    slotStepperOpen ||
    vehicleSelectorOpen ||
    activeVehicleDetails ||
    goodsTypeModalOpen ||
    supportModalOpen ||
    showAccountPortal
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
    if (cargoSelectorOpen) {
      setCargoSelectorOpen(false)
      return
    }
    if (slotStepperOpen) {
      if (stepperStep > 1) {
        setStepperStep(prev => prev - 1)
      } else {
        setSlotStepperOpen(false)
      }
      return
    }
    if (vehicleSelectorOpen) {
      setVehicleSelectorOpen(false)
      return
    }
    if (activeVehicleDetails) {
      setActiveVehicleDetails(null)
      return
    }
    if (goodsTypeModalOpen) {
      setGoodsTypeModalOpen(false)
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
      if (cargoSelectorOpen) {
        setCargoSelectorOpen(false)
        return
      }
      if (slotStepperOpen) {
        if (stepperStep > 1) {
          setStepperStep(prev => prev - 1)
        } else {
          setSlotStepperOpen(false)
        }
        return
      }
      if (vehicleSelectorOpen) {
        setVehicleSelectorOpen(false)
        return
      }
      if (activeVehicleDetails) {
        setActiveVehicleDetails(null)
        return
      }
      if (goodsTypeModalOpen) {
        setGoodsTypeModalOpen(false)
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
    mapPickerTarget, cargoSelectorOpen, slotStepperOpen, stepperStep,
    vehicleSelectorOpen, activeVehicleDetails, goodsTypeModalOpen,
    supportModalOpen, showAccountPortal
  ])


  useEffect(() => {
    let cancelled = false
    async function loadCatalog() {
      setCatalogLoading(true)
      setCatalogError("")
      try {
        const [tiers, lanes, areas, categories] = await Promise.all([
          fetchServiceTiers("two_wheeler", currentCitySlug),
          fetchLanes("two_wheeler", currentCitySlug),
          fetchServiceAreas(currentCitySlug, "two_wheeler"),
          fetchGoodsCategories(),
        ])
        if (cancelled) return
        setFetchedTiers(tiers)
        setFetchedLanes(lanes)
        setServiceAreas(Array.isArray(areas) ? areas : [])
        if (Array.isArray(categories) && categories.length > 0) {
          const twCats = categories.filter((c) => c.allows_two_wheeler && !c.is_prohibited)
          setDynamicCategories(twCats)
          if (twCats.length > 0) {
            setSelectedGoodsType((prev) => (prev && twCats.some(c => c.name === prev)) ? prev : twCats[0].name)
          }
        } else {
          setCatalogError("Goods catalog temporarily unavailable. Please retry.")
        }
      } catch (err) {
        console.warn("Failed to load logistics catalog:", err)
        if (!cancelled) {
          setCatalogError("Goods catalog temporarily unavailable. Please retry.")
        }
      } finally {
        if (!cancelled) setCatalogLoading(false)
      }
    }
    loadCatalog()
    return () => { cancelled = true }
  }, [currentCitySlug])

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

  const [onlinePickupSuggestions, setOnlinePickupSuggestions] = useState([])
  const [onlineDropSuggestions, setOnlineDropSuggestions] = useState([])
  const [isSearchingOnlineDrop, setIsSearchingOnlineDrop] = useState(false)

  // Debounced dynamic search for drop destination
  useEffect(() => {
    if (!drop || drop.trim().length < 2) {
      setOnlineDropSuggestions([])
      setIsSearchingOnlineDrop(false)
      return
    }
    const timer = setTimeout(async () => {
      setIsSearchingOnlineDrop(true)
      const res = await searchHosurPlacesOnline(drop, currentCityName)
      setOnlineDropSuggestions(res || [])
      setIsSearchingOnlineDrop(false)
    }, 250)
    return () => clearTimeout(timer)
  }, [drop, currentCityName])

  // Debounced dynamic search for pickup location
  useEffect(() => {
    if (!pickup || pickup.trim().length < 2) {
      setOnlinePickupSuggestions([])
      return
    }
    const timer = setTimeout(async () => {
      const res = await searchHosurPlacesOnline(pickup, currentCityName)
      setOnlinePickupSuggestions(res || [])
    }, 250)
    return () => clearTimeout(timer)
  }, [pickup, currentCityName])

  const localPickupMatches = filterLocationSuggestions(pickup)
  const pickupSuggestions = [
    ...localPickupMatches,
    ...onlinePickupSuggestions.filter(
      (on) => !localPickupMatches.some((loc) => loc.name.toLowerCase() === on.name.toLowerCase())
    ),
  ]

  const localDropMatches = filterLocationSuggestions(drop)
  const dropSuggestions = [
    ...localDropMatches,
    ...onlineDropSuggestions.filter(
      (on) => !localDropMatches.some((loc) => loc.name.toLowerCase() === on.name.toLowerCase())
    ),
  ]


  const resolvePickupLocation = async (value, targetAddress) => {
    const addr = targetAddress || (typeof value === "object" ? formatExactLocation(value) : String(value))
    if (typeof value === "object" && value?.lat != null && value?.lng != null) {
      setPickupCoords({ lat: value.lat, lng: value.lng, forAddress: addr })
      return
    }
    setPickupCoords(null)
    const coords = await resolveLocationCoords(value)
    if (coords) {
      setPickupCoords({ ...coords, forAddress: addr })
    }
  }
  const resolveDropLocation = async (value, targetAddress) => {
    const addr = targetAddress || (typeof value === "object" ? formatExactLocation(value) : String(value))
    if (typeof value === "object" && value?.lat != null && value?.lng != null) {
      setDropCoords({ lat: value.lat, lng: value.lng, forAddress: addr })
      return
    }
    setDropCoords(null)
    const coords = await resolveLocationCoords(value)
    if (coords) {
      setDropCoords({ ...coords, forAddress: addr })
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
      : []
    const bestForText = tier.description || ""
    const isBadgeValid = isBadgeActive(tier.duration, tier.updated_at)
    const capacityText = tierCapacityText(tier)
    const badgeText = isBadgeValid ? tierBadgeText(tier.icon || "", tier, capacityText) : ""
    const dims = parseDimensionLabel(tier.dimensions_label)

    return {
      id: tier.slug,
      name: tier.name,
      capacity: capacityText,
      description: tier.description,
      badge: badgeText,
      suitableFor: suitableList,
      bestFor: bestForText,
      price: `₹${Number(tier.starting_price).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`,
      diagram: tier.image
        ? <TierImageFallback src={tier.image} alt={tier.name} fallback={withDims(TWO_WHEELER_DIAGRAM_BY_SLUG[tier.slug], dims) || <GenericTwoWheelerDiagram />} />
        : (withDims(TWO_WHEELER_DIAGRAM_BY_SLUG[tier.slug], dims) || <GenericTwoWheelerDiagram />),
      details: {
        name: tier.name,
        capacity: capacityText ? `${capacityText} capacity` : "Standard capacity",
        badge: badgeText,
        suitableFor: suitableList,
        bestFor: bestForText,
      },
      _tierId: tier.id,
      vehicle_class: tier.vehicle_class || "",
      max_weight_kg: Number(tier.max_weight_kg) || 0,
      max_cft: Number(tier.max_cft) || 0,
    }
  }

  const TWO_WHEELER_VEHICLES = fetchedTiers.map(tierToVehicle)
  const selectedVehicleEffective = selectedVehicle || TWO_WHEELER_VEHICLES[0]

  useEffect(() => {
    if (!selectedVehicle && TWO_WHEELER_VEHICLES.length > 0) {
      setSelectedVehicle(TWO_WHEELER_VEHICLES[0])
    }
  }, [selectedVehicle, TWO_WHEELER_VEHICLES])

  // Only use a stored coordinate if it was resolved for the address being
  // used right now -- see the pickupCoords/dropCoords declaration above.
  const usableCoords = (coords, address) =>
    coords && coords.forAddress === address && coords.lat != null && coords.lng != null
      ? { lat: Number(coords.lat), lng: Number(coords.lng) }
      : null

  const pickupAddressValue = pickup || ""
  const dropAddressValue = drop || (selectedRoute ? selectedRoute.to : "")
  const pickupPoint = usableCoords(pickupCoords, pickupAddressValue)
  const dropPoint = usableCoords(dropCoords, dropAddressValue)

  // GT-B-01: pickup -> waypoints -> drop -> vehicle -> cargo items -> server distance -> server fare.
  // Debounced, and guarded against out-of-order responses.
  useEffect(() => {
    const activeVehicle = selectedVehicle || selectedVehicleEffective
    const tierId = activeVehicle?._tierId
    if (!pickupPoint || !dropPoint || !tierId) {
      setServerQuote(null)
      setQuoteError("")
      return
    }
    let cancelled = false
    setQuoteLoading(true)
    setServerQuote(null)

    const validWaypoints = intermediateStops
      .map((s) => usableCoords(s.coords, s.address))
      .filter(Boolean)

    const timer = setTimeout(async () => {
      const res = await fetchLogisticsQuote({
        serviceCategory: "goods_transport_two_wheeler",
        tierId,
        pickup: pickupPoint,
        drop: dropPoint,
        waypoints: validWaypoints,
        stopCount: 2 + validWaypoints.length,
        cargoItems: cargoItems.map((i) => ({
          goods_item_id: i.goods_item_id || i.goods_item,
          quantity: i.quantity,
        })),
        goodsCategoryId: selectedGoodsCategoryObj?.id,
      })
      if (cancelled) return
      setQuoteLoading(false)
      if (res?.error) {
        setServerQuote(null)
        setQuoteError(res.message || "")
      } else {
        setServerQuote(res)
        setQuoteError("")
      }
    }, 350)
    return () => { cancelled = true; clearTimeout(timer) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    pickupPoint?.lat, pickupPoint?.lng, dropPoint?.lat, dropPoint?.lng,
    (selectedVehicle || selectedVehicleEffective)?._tierId,
    JSON.stringify(cargoItems.map((i) => [i.goods_item_id || i.goods_item, i.quantity])),
    JSON.stringify(intermediateStops.map((s) => [s.address, s.coords?.lat, s.coords?.lng])),
    selectedGoodsCategoryObj?.id,
  ])


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
          const pickupText = formatted || `Current Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`
          setPickup(pickupText)
          setPickupError("")
          setPickupCoords({ lat: latitude, lng: longitude, forAddress: pickupText })
          setLocationStatus("Detected")
          setTimeout(() => setLocationStatus(""), 2500)
        } catch (err) {
          console.warn("Reverse geocoding error:", err)
          const pickupText = `Current Location (${currentCityName || "Hosur"} - ${latitude.toFixed(4)}, ${longitude.toFixed(4)})`
          setPickup(pickupText)
          setPickupError("")
          setPickupCoords({ lat: latitude, lng: longitude, forAddress: pickupText })
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

  const totalCargoWeightKg = cargoItems.reduce((acc, i) => acc + (i.weight_kg || 0) * i.quantity, 0)
  const totalCargoCftVal = cargoItems.reduce((acc, i) => acc + (i.cft || 0) * i.quantity, 0)
  const maxAllowed2WWeight = Number(selectedVehicleEffective?.max_weight_kg) || 0
  const hasIncompatible2WItems = cargoItems.some((i) => i.is_two_wheeler_compatible === false)
  const isSelectedVehicleOverCapacity = serverQuote?.breakdown?.is_cargo_fit != null
    ? serverQuote.breakdown.is_cargo_fit === false
    : Boolean(
      (maxAllowed2WWeight > 0 && totalCargoWeightKg > maxAllowed2WWeight) || hasIncompatible2WItems
    )

  const HOSUR_AREAS = (Array.isArray(serviceAreas) ? serviceAreas : []).map((a) => a?.name).filter(Boolean)

  const POPULAR_ROUTES = fetchedLanes.map((lane) => ({
    to: lane.destination_label,
    distance: lane.distance_km ? `${Number(lane.distance_km)} km` : "",
    fare: `₹${Number(lane.fare).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`,
    time: lane.eta_label,
    _laneId: lane.id,
  }))


  // Changes whenever a stop is added, removed, reordered or moved.
  const stopsCoverageKey = locatedStops(intermediateStops).map((l) => `${l.id}:${l.point.lat},${l.point.lng}`).join("|")

  // Real-time coverage check as soon as both points are known -- replaces
  // the old hardcoded Hosur address-string match (isHosurRouteServed), so
  // expanding coverage is an admin action, not a code change.
  useEffect(() => {
    if (!pickupPoint || !dropPoint) {
      setStopCoverageIssue(null)
      const single = pickupPoint ? ["pickup", pickupPoint] : dropPoint ? ["drop", dropPoint] : null
      if (!single) {
        setCoverageMessage("")
        setNoServiceRoute(false)
        return
      }
      // Only one end is chosen so far: still tell the customer right away if it is uncovered.
      let stale = false
      const t = setTimeout(async () => {
        const res = await checkPointCoverage({
          serviceCategory: "goods_transport_two_wheeler",
          point: single[0],
          location: single[1],
          vehicleClass: (selectedVehicle || selectedVehicleEffective)?.vehicle_class || "",
        })
        if (stale) return
        setCoverageMessage(res.inCoverage ? "" : res.message)
        setNoServiceRoute(!res.inCoverage)
      }, 300)
      return () => { stale = true; clearTimeout(t) }
    }
    let cancelled = false
    // Stops are part of the trip: each located stop is checked with the ends.
    const located = locatedStops(intermediateStops)
    const timer = setTimeout(async () => {
      const res = await checkRouteCoverage({
        serviceCategory: "goods_transport_two_wheeler",
        pickup: pickupPoint,
        drop: dropPoint,
        stops: located.map((l) => l.point),
        vehicleClass: (selectedVehicle || selectedVehicleEffective)?.vehicle_class || "",
      })
      if (cancelled) return
      const stopIssue = coverageIssueForStops(res, located)
      setStopCoverageIssue(stopIssue)
      setCoverageMessage(res.inCoverage ? "" : (stopIssue ? stopIssue.message : res.message))
      setNoServiceRoute(!res.inCoverage)
    }, 300)
    return () => { cancelled = true; clearTimeout(timer) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickupPoint?.lat, pickupPoint?.lng, dropPoint?.lat, dropPoint?.lng, stopsCoverageKey, (selectedVehicle || selectedVehicleEffective)?.vehicle_class])

  const handleGetEstimate = (e) => {
    if (e) e.preventDefault()
    const hasNoPickup = !pickup || !pickup.trim()
    const hasNoDrop = !drop || !drop.trim()

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

    if (hasNoPickup || hasNoDrop) {
      const targetEl = hasNoPickup
        ? (document.getElementById("pickup-input") || document.getElementById("estimate-bar"))
        : (document.getElementById("drop-input") || document.getElementById("estimate-bar"))
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: "smooth", block: "center" })
        targetEl.focus?.()
      }
      return
    }
    setPickupError("")
    setDestinationError("")
    if (coverageMessage) {
      setNoServiceRoute(true)
      return
    }
    setNoServiceRoute(false)
    setVehicleSelectorOpen(true)
    if (!selectedVehicle) setSelectedVehicle(TWO_WHEELER_VEHICLES[0])
  }

  // Persists the booking to the backend (POST /api/booking/ — see service_requests.BookingCreateView).
  const submitBooking = async (goodsTypeOverride = null, nameOverride = null, phoneOverride = null) => {
    if (bookingSubmitting) return
    setBookingError("")
    setBookingSubmitting(true)
    try {
      const vehicle = selectedVehicle || TWO_WHEELER_VEHICLES[0]
      const currentGoodsType = goodsTypeOverride || selectedGoodsType || "General Goods"

      const activePickupPoint = pickupPoint || (pickupCoords?.lat != null && pickupCoords?.lng != null ? { lat: Number(pickupCoords.lat), lng: Number(pickupCoords.lng) } : null)
      const activeDropPoint = dropPoint || (dropCoords?.lat != null && dropCoords?.lng != null ? { lat: Number(dropCoords.lat), lng: Number(dropCoords.lng) } : null)

      if (!activePickupPoint || !activeDropPoint) {
        setBookingSubmitting(false)
        setBookingError("Please pick both the pickup and drop locations from the suggestions so we can map the route.")
        return
      }

      // Service Coverage (server-configured). The booking endpoint enforces
      // the same rule; this just avoids a round-trip we know will fail.
      if (coverageMessage) {
        setBookingSubmitting(false)
        setBookingError(coverageMessage)
        return
      }

      // Check if current server quote is missing or expired
      let currentQuote = serverQuote
      const quoteExpiry = currentQuote?.expiresAt || currentQuote?.expires_at || currentQuote?.breakdown?.expires_at
      const isQuoteExpired = quoteExpiry && new Date(quoteExpiry).getTime() <= Date.now()

      if (!currentQuote?.total || isQuoteExpired) {
        setQuoteLoading(true)
        const validWaypoints = intermediateStops
          .map((s) => usableCoords(s.coords, s.address))
          .filter(Boolean)
        const freshQuote = await fetchLogisticsQuote({
          serviceCategory: "goods_transport_two_wheeler",
          tierId: vehicle._tierId,
          pickup: activePickupPoint,
          drop: activeDropPoint,
          waypoints: validWaypoints,
          stopCount: 2 + validWaypoints.length,
          cargoItems: cargoItems.map((i) => ({
            goods_item_id: i.goods_item_id || i.goods_item,
            quantity: i.quantity,
          })),
          goodsCategoryId: selectedGoodsCategoryObj?.id,
        })
        setQuoteLoading(false)
        if (freshQuote && !freshQuote.error && freshQuote.total != null) {
          setServerQuote(freshQuote)
          currentQuote = freshQuote
        } else {
          setBookingSubmitting(false)
          setBookingError(
            freshQuote?.message ||
            quoteError ||
            "We couldn't calculate a fare for this trip. Select the pickup and drop points from the suggestions, pick a vehicle, and try again."
          )
          return
        }
      }

      if (currentQuote?.breakdown?.is_cargo_fit === false) {
        setBookingError(currentQuote.breakdown.cargo_fit_reason || "Selected cargo exceeds Two-Wheeler capacity. Please book a Mini Truck instead.")
        setBookingSubmitting(false)
        return
      }
      const fare = Number(currentQuote.total)

      // Check 2-Wheeler capacity & item compatibility
      const totalCargoWeight = cargoItems.reduce((acc, i) => acc + (i.weight_kg || 0) * i.quantity, 0)
      const maxW = Number(vehicle?.max_weight_kg) || 0
      const hasIncompatible = cargoItems.some((i) => i.is_two_wheeler_compatible === false)
      if ((maxW > 0 && totalCargoWeight > maxW) || hasIncompatible) {
        setBookingError(
          hasIncompatible
            ? "Selected cargo contains items requiring a Mini Truck. Please book a Mini Truck instead."
            : `Selected cargo (${totalCargoWeight.toFixed(1)}kg) exceeds vehicle capacity (${maxW}kg). Please book a Mini Truck instead.`
        )
        setBookingSubmitting(false)
        return
      }

      let dateString = todayDateString()
      let timeString = "Immediate / Next Available"
      let slotValue = null

      if (bookingMode === "SCHEDULED") {
        if (!selectedDate || !selectedSlot) {
          setBookingSubmitting(false)
          setBookingError("Please select a date and time slot for your scheduled booking.")
          return
        }
        const d = selectedDate.fullDate || new Date()
        dateString = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        timeString = selectedSlot
        slotValue = selectedSlot
      }

      const customerEmail = user?.email || (typeof window !== "undefined" ? localStorage.getItem("sevo_customer_email") : "") || ""

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
        setBookingError("Please enter your name to complete the booking.")
        return
      }

      if (!cleanPhone || cleanPhone.length !== 10) {
        setBookingSubmitting(false)
        setBookingError("Please enter a valid 10-digit mobile number.")
        return
      }

      const cleanReceiverPhone = (receiverPhone || "").replace(/\D/g, "").slice(0, 10)
      if (receiverPhone && cleanReceiverPhone.length !== 10) {
        setBookingSubmitting(false)
        setReceiverPhoneError("Please enter a valid 10-digit receiver phone number.")
        setBookingError("Please enter a valid 10-digit receiver phone number.")
        return
      }
      setReceiverPhoneError("")

      // A stop with an address but no resolved location would be saved without
      // coordinates (the driver could not navigate to it) while the quote --
      // which only prices located stops -- silently ignored it.
      const unpinnedStop = findUnpinnedStop(intermediateStops)
      if (unpinnedStop) {
        setBookingSubmitting(false)
        setBookingError(`Stop ${unpinnedStop.index + 1}: choose a suggestion or pin it on the map, or remove the stop.`)
        return
      }

      const validStops = intermediateStops
        .filter((s) => s.address && s.address.trim())
        .map((s, idx) => ({
          stop_order: idx + 1,
          address: s.address,
          latitude: s.coords?.lat != null ? Number(Number(s.coords.lat).toFixed(6)) : null,
          longitude: s.coords?.lng != null ? Number(Number(s.coords.lng).toFixed(6)) : null,
          contact_name: s.contact_name || "",
          contact_phone: s.contact_phone || "",
        }))

      const cargoDesc = cargoItems.length > 0
        ? ` | Items: ${cargoItems.map(i => `${i.quantity}x ${i.name}`).join(", ")}`
        : ""

      const payload = {
        customer_name: resolvedName,
        phone: cleanPhone,
        email: customerEmail,
        city: currentCitySlug,
        drop_contact_name: (receiverName || resolvedName).trim(),
        drop_contact_phone: cleanReceiverPhone || cleanPhone,
        service_category: "goods_transport_two_wheeler",
        issue_title: `Two-wheeler delivery — ${vehicle.name} (${currentGoodsType})`,

        description: `Goods Type: ${currentGoodsType}${cargoDesc} | Type: ${userType}`,
        address: pickupAddressValue,
        drop_address: dropAddressValue,
        latitude: Number(Number(activePickupPoint.lat).toFixed(6)),
        longitude: Number(Number(activePickupPoint.lng).toFixed(6)),

        preferred_date: dateString,
        preferred_time: timeString,
        total_amount: fare,
        payment_method: "COD",

        stops: validStops,
        cart_data: [{
          tier: vehicle.name,
          price: fare,
          quote_id: currentQuote?.quoteId || currentQuote?.quote_id || currentQuote?.breakdown?.quote_id || null,
          expires_at: currentQuote?.expiresAt || currentQuote?.expires_at || currentQuote?.breakdown?.expires_at || null,
          quote_hash: currentQuote?.quoteHash || currentQuote?.quote_hash || currentQuote?.breakdown?.quote_hash || null,
          goods_type: currentGoodsType,
          cargo_items: cargoItems,
          goods_items: cargoItems,
          stops: validStops,
          route: selectedRoute?.to || null,
          date: bookingMode === "SCHEDULED" ? selectedDate?.value : null,
          slot: slotValue,
          booking_mode: bookingMode,
        }],

      }
      if (selectedGoodsCategoryObj?.id) payload.goods_category_id = selectedGoodsCategoryObj.id
      if (vehicle._tierId) payload.logistics_tier = vehicle._tierId
      if (selectedRoute?._laneId) payload.logistics_lane = selectedRoute._laneId
      // Backend accepts these as optional; only send a real resolved point.
      if (activeDropPoint?.lat != null && activeDropPoint?.lng != null) {
        payload.drop_latitude = Number(Number(activeDropPoint.lat).toFixed(6))
        payload.drop_longitude = Number(Number(activeDropPoint.lng).toFixed(6))
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
        ? Number(res.data.total_amount)
        : (res?.total_amount != null ? Number(res.total_amount) : null)
      setLastBookingId(bookingId)
      setLastTrackingToken(token)
      setLastBookingAmount(authoritativeAmount)
      setVehicleSelectorOpen(false)
      setSlotStepperOpen(false)
      setGoodsTypeModalOpen(false)
      if (bookingMode === "SCHEDULED") {
        setBookingSuccessOpen(true)
      } else {
        setLookingForPartnerOpen(true)
        try {
          sessionStorage.setItem("calservice_active_partner_search", JSON.stringify({
            bookingId,
            trackingToken: token,
            amount: authoritativeAmount,
            serviceCategory: "goods_transport_two_wheeler",
            timestamp: Date.now()
          }))
        } catch (e) { }
      }
    } catch (err) {
      // A booking exists only if the backend created the ServiceRequest.
      console.error("Booking creation failed:", err, "Details:", err?.body)
      const detail = extractApiErrorMessage(err, "We couldn't confirm your booking just now. Nothing has been charged — please try again.")

      // Self-healing: if quote was expired or rejected due to price/staleness, trigger fresh quote fetch
      const isQuoteIssue =
        /expired|invalid|recalculate|quote/i.test(detail) ||
        err?.body?.code === "UNRESOLVED_FARE"

      if (isQuoteIssue) {
        const vehicle = selectedVehicle || TWO_WHEELER_VEHICLES[0]
        const activePickupPoint = pickupPoint || (pickupCoords?.lat != null && pickupCoords?.lng != null ? { lat: Number(pickupCoords.lat), lng: Number(pickupCoords.lng) } : null)
        const activeDropPoint = dropPoint || (dropCoords?.lat != null && dropCoords?.lng != null ? { lat: Number(dropCoords.lat), lng: Number(dropCoords.lng) } : null)
        if (activePickupPoint && activeDropPoint && vehicle?._tierId) {
          const validWaypoints = intermediateStops
            .map((s) => usableCoords(s.coords, s.address))
            .filter(Boolean)
          fetchLogisticsQuote({
            serviceCategory: "goods_transport_two_wheeler",
            tierId: vehicle._tierId,
            pickup: activePickupPoint,
            drop: activeDropPoint,
            waypoints: validWaypoints,
            stopCount: 2 + validWaypoints.length,
            cargoItems: cargoItems.map((i) => ({
              goods_item_id: i.goods_item_id || i.goods_item,
              quantity: i.quantity,
            })),
            goodsCategoryId: selectedGoodsCategoryObj?.id,
          }).then((fresh) => {
            if (fresh && !fresh.error && fresh.total != null) {
              setServerQuote(fresh)
            }
          }).catch(() => {})
        }
      }

      setBookingError(detail)
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
        await cancelBooking(
          lastBookingId,
          `${cancelReason}${cancelComments ? `: ${cancelComments}` : ''}`,
          lastTrackingToken || "",
          phone || ""
        )
      }
    } catch (err) {
      console.warn("Error cancelling booking on server:", err)
    } finally {
      setCancelSubmitting(false)
      setCancelModalOpen(false)
      setLookingForPartnerOpen(false)
      try {
        sessionStorage.removeItem("calservice_active_partner_search")
      } catch (e) { }
    }
  }

  const handleBookNow = () => {

    // Instant Booking: sets bookingMode to IMMEDIATE, clears any stale slot/date, moves to Step 4 Summary
    if (!pickup || !pickup.trim()) {
      setBookingError("Please enter your pickup location.")
      const pickupEl = document.getElementById("pickup-input") || document.getElementById("estimate-bar")
      if (pickupEl) {
        pickupEl.scrollIntoView({ behavior: "smooth", block: "center" })
        pickupEl.focus?.()
      }
      return
    }
    if (!drop || !drop.trim()) {
      if (selectedRoute?.to) {
        const exactDrop = formatExactLocation(selectedRoute.to)
        setDrop(exactDrop)
        resolveLocationCoords(exactDrop).then((c) => {
          if (c) setDropCoords({ ...c, forAddress: exactDrop })
        })
      } else {
        setBookingError("Please enter your delivery destination.")
        const dropEl = document.getElementById("drop-input") || document.getElementById("estimate-bar")
        if (dropEl) {
          dropEl.scrollIntoView({ behavior: "smooth", block: "center" })
          dropEl.focus?.()
        }
        return
      }
    }

    if (!selectedVehicle) {
      setSelectedVehicle(TWO_WHEELER_VEHICLES[0])
    }
    setBookingMode("IMMEDIATE")
    setSelectedDate(null)
    setSelectedSlot(null)
    setVehicleSelectorOpen(false)
    setStepperStep(4)
    setSlotStepperOpen(true)
  }

  const handleScheduleBooking = () => {

    // Schedule Booking: sets bookingMode to SCHEDULED, initializes default date/slot if unset, opens Step 3 Slot selection
    if (!pickup || !pickup.trim()) {
      setBookingError("Please enter your pickup location.")
      const pickupEl = document.getElementById("pickup-input") || document.getElementById("estimate-bar")
      if (pickupEl) {
        pickupEl.scrollIntoView({ behavior: "smooth", block: "center" })
        pickupEl.focus?.()
      }
      return
    }
    if (!drop || !drop.trim()) {
      if (selectedRoute?.to) {
        const exactDrop = formatExactLocation(selectedRoute.to)
        setDrop(exactDrop)
        resolveLocationCoords(exactDrop).then((c) => {
          if (c) setDropCoords({ ...c, forAddress: exactDrop })
        })
      } else {
        setBookingError("Please enter your delivery destination.")
        const dropEl = document.getElementById("drop-input") || document.getElementById("estimate-bar")
        if (dropEl) {
          dropEl.scrollIntoView({ behavior: "smooth", block: "center" })
          dropEl.focus?.()
        }
        return
      }
    }

    if (!selectedVehicle) {
      setSelectedVehicle(TWO_WHEELER_VEHICLES[0])
    }
    setBookingMode("SCHEDULED")
    if (!selectedDate) setSelectedDate((serverDates && serverDates.length > 0) ? serverDates[0] : DELIVERY_DATES[0])
    setVehicleSelectorOpen(false)
    setStepperStep(3)
    setSlotStepperOpen(true)
  }

  const handleSendOtp = async () => {
    const cleanPhoneOtp = phone.replace(/\D/g, "")
    if (!cleanPhoneOtp || cleanPhoneOtp.length !== 10) {
      setPhoneError("Mobile number must be exactly 10 digits.")
      return
    }
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

  const handleLogoClick = () => {
    if (lookingForPartnerOpen) {
      setShowExitConfirm(true)
    } else {
      navigate(routes.landing)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--sevo-bg)] text-[var(--sevo-text-primary)] font-sans antialiased pb-28 lg:pb-0">
      {/* ── Top Header Navigation ─────────────── */}
      {/* Exit Confirmation Modal */}
      {showExitConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div className="bg-[var(--sevo-surface)] rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-[var(--sevo-border)] text-center animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-amber-50 border-2 border-amber-100 flex items-center justify-center mx-auto mb-4 text-amber-600">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-[var(--sevo-text-primary)] mb-2">Do you want to exit?</h3>
            <p className="text-xs text-[var(--sevo-text-secondary)] font-medium leading-relaxed mb-6">
              Exiting will close the partner search screen. Your booking request will remain active in your bookings.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowExitConfirm(false)
                  setLookingForPartnerOpen(false)
                  try {
                    sessionStorage.removeItem("calservice_active_partner_search")
                  } catch (e) { }
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
                className="flex-1 py-3 bg-[var(--sevo-error)] hover:opacity-90 active:scale-95 text-white font-extrabold text-sm rounded-xl transition-all cursor-pointer shadow-md"
              >
                Yes, Exit
              </button>
              <button
                type="button"
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 py-3 bg-[var(--sevo-surface-raised)] hover:bg-[var(--sevo-surface-subtle)] active:scale-95 text-[var(--sevo-text-primary)] border border-[var(--sevo-border)] font-extrabold text-sm rounded-xl transition-all cursor-pointer"
              >
                No, Stay
              </button>
            </div>
          </div>
        </div>
      )}

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
            <div className="flex items-center gap-3 cursor-pointer select-none group" onClick={handleLogoClick}>
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
                  Two-Wheeler Delivery
                </span>
              </div>
            </div>
          </div>

          {/* Location Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--sevo-primary-light)] border border-[var(--sevo-primary)]/20 text-xs font-bold text-[var(--sevo-primary)]">
            <MapPin className="w-3.5 h-3.5 text-[var(--sevo-primary)]" />
            <span>{currentCityName}</span>
          </div>

          <div className="hidden md:flex items-center gap-6 text-sm font-bold text-[var(--sevo-text-secondary)]">
            <span className="hover:text-[var(--sevo-primary)] transition-colors cursor-pointer" onClick={handleLogoClick}>Services</span>
            <span className="hover:text-[var(--sevo-primary)] transition-colors cursor-pointer" onClick={handleLogoClick}>For Enterprise</span>
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

      {/* ── Hero Section (Uniform Image 2 Style) ────────────────────── */}
      <section
        className="relative pt-10 pb-8 sm:pt-14 sm:pb-12 border-b border-slate-100/60 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url('/hero_twowheeler_bg.png')` }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-slate-950/55 to-slate-950/80"></div>
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 text-center z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-emerald-300 text-xs font-bold tracking-wide mb-4 shadow-sm border border-white/25 backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
            {currentCityName} Two-Wheeler Service
          </div>

          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight max-w-3xl mx-auto drop-shadow-lg">
            Affordable and Trusted Two-Wheeler Delivery in {currentCityName}
          </h1>

          <p className="mt-4 text-sm sm:text-base text-slate-200 max-w-2xl mx-auto leading-relaxed drop-shadow">
            Whether you're sending documents, daily essentials, or parcel deliveries across the city, our two-wheeler courier service in {currentCityName} offers fast, safe, and cost-effective delivery
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
            className="bg-white rounded-2xl sm:rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200/80 p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3 sm:gap-3.5 items-start"
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
                  placeholder={`Enter pickup location in ${currentCityName}`}
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
                    setPickupCoords(null)
                    if (e.target.value.trim()) setPickupError("")
                    setShowPickupSuggestions(true)
                  }}
                  className={`w-full pl-3 pr-16 h-10 sm:h-11 text-xs sm:text-sm bg-slate-50 hover:bg-slate-100/80 focus:bg-white border rounded-xl focus:outline-none transition-all text-slate-800 font-medium ${pickupError
                      ? "border-rose-500 ring-2 ring-rose-200 bg-rose-50/20 focus:border-rose-500"
                      : "border-slate-200 focus:border-emerald-500"
                    }`}
                  required
                  autoComplete="off"
                />
                <div className="absolute right-2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setMapPickerTarget("pickup")}
                    title="Pick on interactive map"
                    className="text-slate-400 hover:text-emerald-600 p-1 rounded-lg hover:bg-emerald-50 transition-colors cursor-pointer"
                  >
                    <MapPin className="w-3.5 h-3.5 text-emerald-600 hover:scale-110 transition-transform" />
                  </button>
                  <button
                    type="button"
                    onClick={handleFetchLiveLocation}
                    disabled={isDetectingLocation}
                    title="Fetch live GPS location"
                    className="text-slate-400 hover:text-emerald-600 p-1 rounded-lg hover:bg-emerald-50 transition-colors cursor-pointer"
                  >
                    {isDetectingLocation ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                    ) : (
                      <LocateFixed className="w-3.5 h-3.5 hover:scale-110 transition-transform" />
                    )}
                  </button>
                </div>
              </div>
              {pickupError && (
                <p className="absolute -bottom-5 left-0 text-[10px] font-bold text-rose-600 flex items-center gap-1 whitespace-nowrap z-20 animate-in fade-in">
                  <AlertCircle className="w-3 h-3 text-rose-500 shrink-0" />
                  <span>{pickupError}</span>
                </p>
              )}

              {/* Pickup Suggestions Dropdown */}
              {showPickupSuggestions && (
                <div className="absolute top-full left-0 mt-1.5 w-[320px] sm:w-[370px] max-w-[90vw] bg-white rounded-2xl shadow-2xl border border-slate-200/90 z-50 overflow-hidden max-h-72 overflow-y-auto">
                  <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <span>{pickup ? `Suggestions for "${pickup}"` : `Suggested ${currentCityName} Locations`}</span>
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
                            const exact = formatExactLocation(loc, currentCityName)
                            setPickup(exact)
                            setPickupError("")
                            resolvePickupLocation(loc, exact)
                            setNoServiceRoute(false)
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
                            const exact = formatExactLocation(pickup)
                            setPickup(exact)
                            resolvePickupLocation(exact, exact)
                            setNoServiceRoute(false)
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
              <div className="relative flex items-center">
                <input
                  id="drop-input"
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
                    setDropCoords(null)
                    if (e.target.value.trim()) setDestinationError("")
                    setShowDropSuggestions(true)
                  }}
                  className={`w-full pl-3 pr-9 h-10 sm:h-11 text-xs sm:text-sm bg-slate-50 hover:bg-slate-100/80 focus:bg-white border rounded-xl focus:outline-none transition-all text-slate-800 font-medium ${destinationError
                      ? "border-rose-500 ring-2 ring-rose-200 bg-rose-50/20 focus:border-rose-500"
                      : "border-slate-200 focus:border-emerald-500"
                    }`}
                  required
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setMapPickerTarget("drop")}
                  title="Pick on interactive map"
                  className="absolute right-2 text-slate-400 hover:text-emerald-600 p-1 rounded-lg hover:bg-emerald-50 transition-colors cursor-pointer"
                >
                  <MapPin className="w-3.5 h-3.5 text-rose-500 hover:scale-110 transition-transform" />
                </button>
              </div>
              {destinationError && (
                <p className="absolute -bottom-5 left-0 text-[10px] font-bold text-rose-600 flex items-center gap-1 whitespace-nowrap z-20 animate-in fade-in">
                  <AlertCircle className="w-3 h-3 text-rose-500 shrink-0" />
                  <span>{destinationError}</span>
                </p>
              )}

              {/* Drop Suggestions Dropdown */}
              {showDropSuggestions && (
                <div className="absolute top-full left-0 sm:left-auto sm:right-0 lg:left-0 lg:right-auto mt-1.5 w-[320px] sm:w-[370px] max-w-[90vw] bg-white rounded-2xl shadow-2xl border border-slate-200/90 z-50 overflow-hidden max-h-72 overflow-y-auto">
                  <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <span>{drop ? `Suggestions for "${drop}"` : "Suggested Delivery Destinations"}</span>
                    <span className="text-[9px] text-emerald-700 font-semibold flex items-center gap-1">
                      {isSearchingOnlineDrop && <Loader2 className="w-2.5 h-2.5 animate-spin text-emerald-600" />}
                      {isSearchingOnlineDrop ? "Searching live..." : `${dropSuggestions.length} found`}
                    </span>
                  </div>
                  <div className="p-1 space-y-0.5">
                    {dropSuggestions.length > 0 ? (
                      dropSuggestions.map((loc, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault()
                            const exact = formatExactLocation(loc)
                            setDrop(exact)
                            resolveDropLocation(loc, exact)
                            setDestinationError("")
                            setNoServiceRoute(false)
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
                            const exact = formatExactLocation(drop)
                            setDrop(exact)
                            resolveDropLocation(exact, exact)
                            setDestinationError("")
                            setNoServiceRoute(false)
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

            {/* Multi-Stop Waypoints Section (Expandable / Inline) */}
            <div className="col-span-1 sm:col-span-2 md:col-span-6 border-t border-slate-200/80 pt-3">
              <MultiStopRouteManager
                stops={intermediateStops}
                onChangeStops={(newStops) => setIntermediateStops(newStops)}
                maxStops={3}
                pickupAddress={pickupAddressValue}
                dropAddress={dropAddressValue}
                pickupPoint={pickupPoint}
                dropPoint={dropPoint}
                serviceSlug="goods_transport_two_wheeler"
                vehicleClass={(selectedVehicle || selectedVehicleEffective)?.vehicle_class || ""}
                coverageIssue={stopCoverageIssue}
                cityName={currentCityName || "Hosur"}
              />
            </div>

            {/* Goods & Cargo Item Selector Banner */}
            <div className="col-span-1 sm:col-span-2 md:col-span-6 bg-slate-50/80 border border-slate-200 rounded-2xl p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 shadow-2xs">
                  <Boxes className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded">
                      {selectedGoodsCategoryObj?.name || selectedGoodsType || "General Goods"}
                    </span>
                    {cargoItems.length > 0 && (
                      <span className="text-[10px] font-bold text-slate-500">
                        ({cargoItems.reduce((acc, i) => acc + i.quantity, 0)} items)
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-bold text-slate-800 mt-0.5 truncate">
                    {cargoItems.length > 0
                      ? cargoItems.map((i) => `${i.quantity}x ${i.name}`).join(", ")
                      : "No specific items declared (category rules only, no weight/volume assumed)"}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {cargoItems.length > 0
                      ? `Weight: ~${cargoItems.reduce((acc, i) => acc + (i.weight_kg || 0) * i.quantity, 0).toFixed(1)} kg • Volume: ~${cargoItems.reduce((acc, i) => acc + (i.cft || 0) * i.quantity, 0).toFixed(1)} CFT`
                      : "Add items (e.g. Documents, Boxes, Small Goods) to calculate weight & volume fitment"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCargoSelectorOpen(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-600/20 cursor-pointer whitespace-nowrap self-start sm:self-auto"
              >
                {cargoItems.length > 0 ? "Edit Goods / Items" : "+ Select Goods & Items"}
              </button>
            </div>

            {/* Name */}
            <div className="flex flex-col text-left">
              <div className="h-5 mb-1.5 flex items-center">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                  Customer Name
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
              <div className="h-5 mb-1.5 flex items-center justify-between">
                <label className={`text-[11px] font-bold uppercase tracking-wider whitespace-nowrap ${phoneError ? "text-red-500" : "text-slate-500"}`}>
                  Mobile Number *
                </label>
                <span className={`text-[10px] font-semibold tabular-nums ml-2 ${phone.length === 10 ? "text-emerald-600" : phone.length > 0 ? "text-amber-500" : "text-slate-400"}`}>
                  {phone.length}/10
                </span>
              </div>
              <input
                type="tel"
                inputMode="numeric"
                pattern="[0-9]{10}"
                maxLength={10}
                placeholder="10-digit mobile number"
                value={phone}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, "").slice(0, 10)
                  setPhone(digits)
                  if (phoneError && digits.length === 10) setPhoneError("")
                }}
                onBlur={() => {
                  const digits = phone.replace(/\D/g, "")
                  if (digits.length > 0 && digits.length !== 10) {
                    setPhoneError("Mobile number must be exactly 10 digits.")
                  } else {
                    setPhoneError("")
                  }
                }}
                onFocus={() => setPhoneError("")}
                className={`w-full px-3 h-10 sm:h-11 text-xs sm:text-sm bg-slate-50 hover:bg-slate-100/80 focus:bg-white border rounded-xl focus:outline-none transition-all text-slate-800 font-medium ${phoneError ? "border-red-400 focus:border-red-500 bg-red-50/30" : phone.length === 10 ? "border-emerald-400 focus:border-emerald-500" : "border-slate-200 focus:border-emerald-500"
                  }`}
                required
              />
              {phoneError && (
                <p className="text-[10px] text-red-500 font-semibold mt-1 flex items-center gap-1">
                  <span>⚠</span> {phoneError}
                </p>
              )}
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

          {/* Live Fare Card & CTA below estimate form */}
          {pickupPoint && dropPoint && (quoteLoading || serverQuote || quoteError) && (
            <div className="mt-4 p-4 rounded-2xl bg-white border border-emerald-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in duration-200">
              <div className="flex-1 w-full sm:w-auto">
                {quoteLoading && (
                  <div className="flex items-center gap-2 text-emerald-800 font-semibold text-xs sm:text-sm">
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                    <span>Calculating authoritative fare for route…</span>
                  </div>
                )}
                {!quoteLoading && serverQuote && (
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-800">
                        Authoritative Fare:
                      </span>
                      <span className="text-xl sm:text-2xl font-black text-emerald-900">
                        ₹{Number(serverQuote.total).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    {serverQuote.breakdown && (
                      <p className="text-xs text-slate-600 mt-1">
                        {serverQuote.breakdown.distance_km} km
                        {serverQuote.breakdown.distance_source === "straight_line_estimate" ? " (est.)" : ""}
                        {" • "}Base ₹{serverQuote.breakdown.base_fare}
                        {Number(serverQuote.breakdown.distance_charge) > 0 ? ` • Distance ₹${serverQuote.breakdown.distance_charge}` : ""}
                        {Number(serverQuote.breakdown.additional_stop_charge) > 0 ? ` • Stops ₹${serverQuote.breakdown.additional_stop_charge}` : ""}
                      </p>
                    )}
                  </div>
                )}
                {!quoteLoading && !serverQuote && quoteError && (
                  <div className="flex items-center gap-2 text-rose-700 text-xs font-bold">
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                    <span>{quoteError}</span>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setNoServiceRoute(false)
                  setVehicleSelectorOpen(true)
                }}
                disabled={quoteLoading || serverQuote?.total == null}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
              >
                <span>Proceed to Booking</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* No-Service Route Warning */}
          {noServiceRoute && (
            <div className="mt-3 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 border-rose-400 bg-rose-50 text-rose-700 text-xs font-extrabold uppercase tracking-widest animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              {coverageMessage || "WE DO NOT OPERATE FOR THE SELECTED ROUTE"}
            </div>
          )}
        </div>
      </section>

      {/* ── Section: Book Two-Wheelers in Hosur (Uniform Centered Cards Style) ── */}
      <section className="pt-6 sm:pt-8 pb-12 sm:pb-16 max-w-5xl mx-auto px-4 sm:px-6">
        <div className="text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Book Two-Wheelers in {currentCityName || "Hosur"}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-2">
            Fast, secure &amp; economical courier delivery right to your recipient's doorstep
          </p>
        </div>

        {/* Centered Cards matching Truck UI layout / dynamic active packages */}
        {(pickupError || destinationError) && (
          <div className="max-w-2xl mx-auto mb-6 p-4 bg-rose-50 border-2 border-rose-200 text-rose-700 rounded-2xl text-xs font-bold flex items-center justify-between shadow-sm animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>
                {pickupError && destinationError
                  ? "Pickup location and delivery destination are not provided. Please enter both in the form above to proceed with booking."
                  : pickupError
                    ? "Pickup location is not provided. Please enter a pickup location in the form above to proceed with booking."
                    : "Destination is not provided. Please enter a delivery destination in the form above to proceed with booking."}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                const targetEl = pickupError
                  ? (document.getElementById("pickup-input") || document.getElementById("estimate-bar"))
                  : (document.getElementById("drop-input") || document.getElementById("estimate-bar"))
                if (targetEl) {
                  targetEl.scrollIntoView({ behavior: "smooth", block: "center" })
                  targetEl.focus?.()
                }
              }}
              className="underline font-black text-rose-800 hover:text-rose-950 cursor-pointer ml-3 shrink-0"
            >
              {pickupError && destinationError
                ? "Enter Locations ↑"
                : pickupError
                  ? "Enter Pickup ↑"
                  : "Enter Destination ↑"}
            </button>
          </div>
        )}

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
                    className={`absolute top-3.5 right-3.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border shadow-2xs ${vehicle.badge.toLowerCase().includes("coming")
                        ? "bg-amber-100 text-amber-900 border-amber-300 uppercase tracking-wider px-3"
                        : vehicle.badge.toLowerCase().includes("popular")
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : vehicle.badge.toLowerCase().includes("rare")
                            ? "bg-slate-100 text-slate-700 border-slate-200"
                            : vehicle.badge.toLowerCase().includes("best")
                              ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                              : vehicle.badge.toLowerCase().includes("trend")
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : "bg-blue-50 text-blue-700 border-blue-200"
                      }`}
                  >
                    {vehicle.badge.toLowerCase().includes("coming") ? "" : "★ "}
                    {vehicle.badge}
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

                {/* Proceed to Booking button */}
                <div className="w-full mt-5 pt-4 border-t border-slate-100 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      const hasNoPickup = !pickup || !pickup.trim()
                      const hasNoDrop = !drop || !drop.trim()
                      if (hasNoPickup) setPickupError("Pickup location is not provided")
                      if (hasNoDrop) setDestinationError("Destination is not provided")
                      if (hasNoPickup || hasNoDrop) {
                        const targetEl = hasNoPickup
                          ? (document.getElementById("pickup-input") || document.getElementById("estimate-bar"))
                          : (document.getElementById("drop-input") || document.getElementById("estimate-bar"))
                        if (targetEl) {
                          targetEl.scrollIntoView({ behavior: "smooth", block: "center" })
                          targetEl.focus?.()
                        }
                        return
                      }
                      setPickupError("")
                      setDestinationError("")
                      setSelectedVehicle(vehicle)
                      setNoServiceRoute(false)
                      setVehicleSelectorOpen(true)
                    }}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20 flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Proceed to Booking</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Section: Popular Routes ────────────────────── */}
      {POPULAR_ROUTES.length > 0 && (
        <section className="py-12 sm:py-16 bg-slate-50/80 border-y border-slate-200/60">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Popular Two-Wheeler Delivery Routes from {currentCityName || "Hosur"}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Guaranteed lowest courier rates with live tracking across {currentCityName || "Hosur"} &amp; connected corridors
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
                        setDropCoords(null)
                        resolveLocationCoords(exactDrop, currentCityName).then((c) => {
                          if (c) setDropCoords({ ...c, forAddress: exactDrop })
                        })
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

      {/* ── Section: Areas We Serve ─────── */}
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

      {/* ── Section: Other Services to Choose From ─────────────── */}
      <section className="py-12 sm:py-16 max-w-4xl mx-auto px-4 sm:px-6 text-center">
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

          {/* Packers and Movers Card */}
          <div
            onClick={() => navigate(`/packers-and-movers/${currentCitySlug || "hosur"}`)}
            className="bg-[#f0f3fa] rounded-3xl p-7 border border-slate-200/60 hover:shadow-lg transition-all cursor-pointer flex flex-col items-center gap-3 group"
          >
            <div className="h-24 flex items-center justify-center">
              <PackersMoversGraphic className="w-28 h-20 group-hover:scale-105 transition-transform" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Packers and Movers</h3>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); navigate(`/packers-and-movers/${currentCitySlug || "hosur"}`) }}
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

      {/* ── Modals: Vehicle Selector, Login/OTP, Success ── */}

      {/* 2. Vehicle Selector Modal (Matching Porter App - Image 2) */}
      {vehicleSelectorOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setVehicleSelectorOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-100 relative overflow-hidden flex flex-col sm:flex-row max-h-[92vh]"
          >
            <button
              onClick={() => setVehicleSelectorOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer z-10"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Left: Address Details + Fare Breakdown + Goods Type */}
            <div className="sm:w-[48%] shrink-0 bg-slate-50 p-5 sm:p-6 border-b sm:border-b-0 sm:border-r border-slate-200 flex flex-col justify-between overflow-y-auto">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 mb-4">Address Details</h3>

                {/* Pickup */}
                <div className="flex items-start gap-3 mb-3">
                  <div className="mt-1 w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold text-slate-800 truncate">{name || "Customer"} • {phone || "Enter phone number"}</p>
                    <p className="text-xs text-slate-500 leading-snug mt-0.5">{pickup || "Select pickup location"}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setVehicleSelectorOpen(false)
                      const bar = document.getElementById("estimate-bar")
                      if (bar) bar.scrollIntoView({ behavior: "smooth", block: "center" })
                    }}
                    className="text-xs font-bold text-emerald-700 hover:underline cursor-pointer shrink-0"
                  >Edit</button>
                </div>

                {/* Dashed line */}
                <div className="ml-[4px] w-[2px] h-4 bg-slate-300 border-l-2 border-dashed border-slate-400 mb-1" />

                {/* Waypoints */}
                {intermediateStops.filter(s => s.address).map((stop, sIdx) => (
                  <React.Fragment key={stop.id || sIdx}>
                    <div className="flex items-start gap-3 mb-2">
                      <div className="mt-1 w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold text-blue-900 truncate">
                          {stop.contact_name ? `${stop.contact_name} • ${stop.contact_phone || ""}` : `Stop ${sIdx + 1}`}
                        </p>
                        <p className="text-xs text-slate-500 leading-snug mt-0.5">{stop.address}</p>
                      </div>
                    </div>
                    <div className="ml-[4px] w-[2px] h-3 bg-slate-300 border-l-2 border-dashed border-slate-400 mb-1" />
                  </React.Fragment>
                ))}

                {/* Drop */}
                <div className="flex items-start gap-3 mb-2">
                  <div className="mt-1 w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold text-slate-800 truncate">
                      {receiverName ? `Receiver: ${receiverName} • ${receiverPhone || phone}` : `${name || "Customer"} • ${phone || "Enter phone number"}`}
                    </p>
                    <p className="text-xs text-slate-500 leading-snug mt-0.5">{drop || (selectedRoute ? selectedRoute.to : "Select destination")}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        // Bug found: same as MiniTruckBookingHosurPage's identical
                        // control -- toggling only hid the fields without clearing
                        // receiverName/receiverPhone, so the line above kept showing
                        // "Receiver: ..." after Hide was clicked, and the stale values
                        // were still submitted as drop_contact_name/drop_contact_phone.
                        const next = !showReceiverDetails
                        setShowReceiverDetails(next)
                        if (!next) {
                          setReceiverName("")
                          setReceiverPhone("")
                          setReceiverPhoneError("")
                        }
                      }}
                      className="text-xs font-bold text-blue-700 hover:underline cursor-pointer"
                    >
                      {showReceiverDetails ? "Hide" : "+ Receiver"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setVehicleSelectorOpen(false)
                        const bar = document.getElementById("estimate-bar")
                        if (bar) bar.scrollIntoView({ behavior: "smooth", block: "center" })
                      }}
                      className="text-xs font-bold text-emerald-700 hover:underline cursor-pointer shrink-0"
                    >Edit</button>
                  </div>
                </div>


                {showReceiverDetails && (
                  <div className="p-3 bg-white rounded-xl border border-slate-200 mb-3 space-y-2 animate-in fade-in duration-150">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Receiver Details at Destination</p>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Receiver Name"
                        value={receiverName}
                        onChange={(e) => setReceiverName(e.target.value)}
                        className="h-8 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:border-emerald-500"
                      />
                      <input
                        type="tel"
                        placeholder="10-digit Phone"
                        maxLength={10}
                        value={receiverPhone}
                        onChange={(e) => {
                          setReceiverPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
                          if (receiverPhoneError) setReceiverPhoneError("")
                        }}
                        className="h-8 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    {receiverPhoneError && (
                      <p className="text-[10px] text-rose-600 font-semibold">{receiverPhoneError}</p>
                    )}
                  </div>
                )}

                {/* Fare Breakdown -- GT-B-01 */}
                {(() => {
                  const q = serverQuote
                  const b = q?.breakdown || null
                  const money = (v) =>
                    `₹${Number(v).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  const positive = (v) => v != null && Number(v) > 0

                  if (quoteLoading) {
                    return (
                      <div className="border-t border-slate-200/80 pt-3 pb-2 text-xs text-slate-500">
                        <h4 className="text-xs font-bold text-slate-900 mb-2">Fare Breakdown</h4>
                        <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/70 text-amber-900 flex items-center gap-2">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
                          <span className="font-semibold text-xs">Recalculating fare for updated cargo/route…</span>
                        </div>
                      </div>
                    )
                  }
                  if (!q || q.total == null) {
                    return (
                      <div className="border-t border-slate-200/80 pt-3 pb-2 text-xs">
                        <h4 className="text-xs font-bold text-slate-900 mb-2">Fare Breakdown</h4>
                        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 space-y-1.5">
                          <p className="font-bold flex items-center gap-1.5 text-xs text-rose-800">
                            <AlertCircle className="w-3.5 h-3.5 text-rose-600" /> Fare calculation error
                          </p>
                          <p className="text-xs text-rose-700">
                            {quoteError || "We couldn't calculate a fare for this trip yet. Select the pickup and drop points from the suggestions and pick a vehicle."}
                          </p>
                        </div>
                      </div>
                    )
                  }

                  return (
                    <div className="border-t border-slate-200/80 pt-3 pb-2 space-y-1.5 text-xs text-slate-600">
                      <h4 className="text-xs font-bold text-slate-900 mb-2">Fare Breakdown</h4>
                      {b ? (
                        <>
                          <div className="flex justify-between">
                            <span>Base Fare</span>
                            <span className="font-semibold text-slate-800">{money(b.base_fare ?? 0)}</span>
                          </div>
                          {b.distance_charge != null && (
                            <div className="flex justify-between">
                              <span>
                                Distance Charge
                                {b.chargeable_km != null && b.rate_per_km != null && (
                                  <span className="text-slate-400"> ({Number(b.chargeable_km).toFixed(1)} km × ₹{Number(b.rate_per_km).toFixed(0)}/km)</span>
                                )}
                              </span>
                              <span className="font-semibold text-slate-800">{money(b.distance_charge)}</span>
                            </div>
                          )}
                          {positive(b.loading_unloading) && (
                            <div className="flex justify-between">
                              <span>Loading &amp; Unloading</span>
                              <span className="font-semibold text-slate-800">{money(b.loading_unloading)}</span>
                            </div>
                          )}
                          {positive(b.additional_stop_charge) && (
                            <div className="flex justify-between">
                              <span>Additional Stops ({b.additional_stops || intermediateStops.length})</span>
                              <span className="font-semibold text-slate-800">{money(b.additional_stop_charge)}</span>
                            </div>
                          )}
                          {Number(b.surge_multiplier || 1) !== 1 && (
                            <div className="flex justify-between text-amber-600">
                              <span>Surge ({Number(b.surge_multiplier).toFixed(2)}×)</span>
                              <span className="font-semibold">applied</span>
                            </div>
                          )}
                          {b.minimum_fare_applied && (
                            <p className="text-[10px] text-amber-600">Minimum fare applied for this trip.</p>
                          )}
                        </>
                      ) : (
                        <div className="flex justify-between">
                          <span>Trip Fare</span>
                          <span className="font-semibold text-slate-800">{money(q.total)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-extrabold text-slate-900 text-sm pt-1 border-t border-slate-200">
                        <span>Amount Payable</span>
                        <span>{money(q.total)}</span>
                      </div>
                    </div>
                  )
                })()}

                {/* Goods Type & Cargo Row */}
                <div className="mt-3 p-3 rounded-2xl bg-white border border-slate-200 flex items-center justify-between shadow-2xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                      <Boxes className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">CARGO & GOODS</p>
                      <p className="text-xs font-bold text-slate-800 truncate">
                        {cargoItems.length > 0
                          ? `${cargoItems.reduce((acc, i) => acc + i.quantity, 0)} items (${cargoItems.map((i) => `${i.quantity}x ${i.name}`).join(", ")})`
                          : (selectedGoodsType || "General Goods")}
                      </p>
                      {cargoItems.length > 0 && (
                        <p className="text-[10px] text-emerald-700 font-semibold">
                          ~{cargoItems.reduce((acc, i) => acc + (i.weight_kg || 0) * i.quantity, 0).toFixed(1)} kg • ~{cargoItems.reduce((acc, i) => acc + (i.cft || 0) * i.quantity, 0).toFixed(1)} CFT
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCargoSelectorOpen(true)}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer shrink-0"
                  >
                    {cargoItems.length > 0 ? "Edit Cargo" : "Select Cargo"}
                  </button>
                </div>

                {/* Cargo Capacity Warning if 2-wheeler capacity is exceeded */}
                {(() => {
                  const totalWeight = totalCargoWeightKg
                  const maxWeight = maxAllowed2WWeight
                  const hasIncompatible = hasIncompatible2WItems
                  if (totalWeight > maxWeight || hasIncompatible) {
                    return (
                      <div className="mt-2.5 p-3 rounded-xl bg-rose-50 border border-rose-300 flex items-start gap-2.5 text-rose-800 text-[11px] font-bold">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p>
                            {hasIncompatible
                              ? "Selected cargo contains items requiring a Mini Truck."
                              : `Cargo weight (${totalWeight.toFixed(1)} kg) exceeds Two-Wheeler limit (${maxWeight} kg).`}
                          </p>
                          <button
                            type="button"
                            onClick={() => navigate(routes.truck_booking_hosur)}
                            className="inline-flex items-center gap-1 mt-1 text-xs font-black text-emerald-800 hover:text-emerald-900 underline cursor-pointer"
                          >
                            <Truck className="w-3 h-3" /> Switch to Mini Truck Booking &rarr;
                          </button>
                        </div>
                      </div>
                    )
                  }
                  return null
                })()}
              </div>

              {/* Action Buttons: Book Now & Schedule */}
              <div className="mt-4 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleBookNow}

                  disabled={bookingSubmitting || quoteLoading || serverQuote?.total == null || isSelectedVehicleOverCapacity}
                  title={
                    isSelectedVehicleOverCapacity
                      ? "Cargo exceeds Two-Wheeler limits. Please book a Mini Truck."
                      : serverQuote?.total == null && !quoteLoading
                        ? "A fare is needed before booking"
                        : undefined
                  }
                  className={`w-full py-3.5 rounded-2xl font-extrabold text-sm shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${isSelectedVehicleOverCapacity
                      ? "bg-slate-300 text-slate-500 cursor-not-allowed shadow-none"
                      : "bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed text-white shadow-emerald-600/30"
                    }`}
                >
                  {bookingSubmitting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Confirming...</>
                  ) : quoteLoading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Calculating fare…</>
                  ) : isSelectedVehicleOverCapacity ? (
                    <span>Capacity Exceeded — Book Mini Truck</span>

                  ) : (
                    <span>Book Now</span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleScheduleBooking}
                  disabled={bookingSubmitting}
                  className="w-full py-2.5 rounded-xl bg-white hover:bg-emerald-50/60 text-slate-700 border border-slate-300 font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Calendar className="w-3.5 h-3.5 text-slate-600" />
                  <span>Schedule your booking</span>
                </button>
              </div>
              {(quoteLoading || serverQuote || quoteError) && (
                <div className="mt-3 p-3 rounded-xl bg-emerald-50/80 border border-emerald-200/80">
                  {quoteLoading && (
                    <p className="text-[11px] font-semibold text-emerald-800 flex items-center gap-1.5">
                      <Loader2 className="w-3 h-3 animate-spin" /> Calculating your fare…
                    </p>
                  )}
                  {!quoteLoading && serverQuote && (
                    <>
                      <div className="flex items-baseline justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                          Your fare
                        </span>
                        <span className="text-base font-extrabold text-emerald-900">
                          ₹ {Number(serverQuote.total).toLocaleString("en-IN")}
                        </span>
                      </div>
                      {serverQuote.breakdown && (
                        <p className="text-[10px] text-emerald-700 mt-0.5">
                          {serverQuote.breakdown.distance_km} km
                          {serverQuote.breakdown.distance_source === "straight_line_estimate"
                            ? " (estimated route)"
                            : ""}
                          {" · "}base ₹{serverQuote.breakdown.base_fare}
                          {Number(serverQuote.breakdown.distance_charge) > 0
                            ? ` · distance ₹${serverQuote.breakdown.distance_charge}`
                            : ""}
                          {Number(serverQuote.breakdown.additional_stop_charge) > 0
                            ? ` · stops ₹${serverQuote.breakdown.additional_stop_charge}`
                            : ""}
                        </p>
                      )}
                    </>
                  )}
                  {!quoteLoading && !serverQuote && quoteError && (
                    <p className="text-[11px] font-semibold text-slate-600">{quoteError}</p>
                  )}
                </div>
              )}
              {/* A failed booking must be reported to whoever attempted it;
                  gating on isSignedIn hid it in exactly the 401 case. */}
              {bookingError && (
                <p style={{ color: "var(--bad)", fontSize: 12, marginTop: 8, textAlign: "center" }}>{bookingError}</p>
              )}
            </div>

            {/* Right: Select Vehicle */}
            <div className="flex-1 flex flex-col p-5 sm:p-6 overflow-y-auto justify-between">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 mb-4">Select Vehicle</h3>
                <div className="space-y-2.5">
                  {TWO_WHEELER_VEHICLES.map((v) => {
                    const isSelected = selectedVehicle?.id === v.id
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setSelectedVehicle(v)}
                        className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 transition-all cursor-pointer text-left ${isSelected
                            ? "border-emerald-600 bg-emerald-50/50 shadow-md shadow-emerald-100"
                            : "border-slate-200 bg-white hover:border-emerald-300 hover:bg-slate-50"
                          }`}
                      >
                        <div className="w-20 shrink-0 flex items-center justify-center">
                          {React.cloneElement(v.diagram, { className: "w-full h-14" })}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5 text-emerald-700" /> 2 min away
                            </span>
                          </div>
                          <p className="text-sm font-extrabold text-slate-900">{v.name}</p>
                          <p className="text-xs text-slate-500">{v.capacity}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[10px] text-slate-400 font-medium block">Starting from</span>
                          <p className="text-sm font-extrabold text-slate-800">{v.price}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Payment Method Footer */}
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-600">
                  <span className="text-base">💵</span>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Payment Method</p>
                    <p className="font-extrabold text-slate-800">Cash / COD</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-400 uppercase font-bold">TOTAL FARE</p>
                  <p className="text-sm font-black text-slate-900">
                    {serverQuote?.total != null
                      ? `₹ ${Number(serverQuote.total).toLocaleString("en-IN")}`
                      : quoteLoading
                        ? "Calculating…"
                        : quoteError
                          ? "Fare unavailable"
                          : "—"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Select Goods Type Modal (Compact & Professional, Higher z-index) ─────────────────── */}
      {goodsTypeModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[80] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setGoodsTypeModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-200 relative overflow-hidden flex flex-col max-h-[70vh] animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <span className="text-base">📦</span>
                <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Select Goods Type</h3>
              </div>
              <button
                onClick={() => setGoodsTypeModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 px-2 py-1">
              {catalogLoading ? (
                <div className="py-8 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                  <span>Loading goods catalog...</span>
                </div>
              ) : catalogError || dynamicCategories.length === 0 ? (
                <div className="py-8 px-4 text-center text-slate-500 text-xs flex flex-col items-center gap-3">
                  <AlertCircle className="w-6 h-6 text-amber-500" />
                  <p className="font-semibold text-slate-700">Goods catalog temporarily unavailable. Please retry.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setCatalogLoading(true)
                      fetchGoodsCategories()
                        .then((categories) => {
                          if (Array.isArray(categories) && categories.length > 0) {
                            const twCats = categories.filter((c) => c.allows_two_wheeler && !c.is_prohibited)
                            setDynamicCategories(twCats)
                            setCatalogError("")
                          } else {
                            setCatalogError("Goods catalog temporarily unavailable. Please retry.")
                          }
                        })
                        .catch(() => setCatalogError("Goods catalog temporarily unavailable. Please retry."))
                        .finally(() => setCatalogLoading(false))
                    }}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 cursor-pointer"
                  >
                    Retry
                  </button>
                </div>
              ) : (
                dynamicCategories.map((cat) => {
                  const type = cat.name
                  const isSelected = selectedGoodsType === type
                  return (
                    <button
                      key={cat.slug || type}
                      type="button"
                      onClick={() => {
                        setSelectedGoodsType(type)
                        setGoodsTypeModalOpen(false)
                      }}
                      className={`w-full py-2.5 px-3 text-left text-xs font-semibold transition-all cursor-pointer flex items-center justify-between rounded-lg my-0.5 ${isSelected
                          ? "bg-emerald-50 text-emerald-800 font-bold border border-emerald-300 shadow-2xs"
                          : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                        }`}
                    >
                      <span>{type}</span>
                      {isSelected && (
                        <div className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  )
                })
              )}
            </div>

            <div className="p-3 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setGoodsTypeModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Dynamic Goods & Cargo Item Selection Modal (Two-Wheeler Compatible Mode) ── */}
      <GoodsCargoSelectorModal
        isOpen={cargoSelectorOpen}
        onClose={() => setCargoSelectorOpen(false)}
        selectedCargoItems={cargoItems}
        onApplyCargo={async (items, cat) => {
          setCargoItems(items)
          if (cat) {
            setSelectedGoodsCategoryObj(cat)
            setSelectedGoodsType(cat.name)
          }
          if (items && items.length > 0) {
            try {
              const res = await evaluateCargoFitment({
                cargo_items: items.map((i) => ({
                  item_id: i.id || i.goods_item_id,
                  slug: i.slug,
                  quantity: i.quantity,
                })),
                goods_category_id: cat?.id,
                city: currentCitySlug,
              })
              if (res?.cargo_summary?.is_two_wheeler_compatible === false || res?.recommended_tier?.category === "truck") {
                setBookingError(
                  `Selected cargo exceeds Two-Wheeler limits (~${res.cargo_summary.total_weight_kg} kg, ~${res.cargo_summary.total_cft} CFT). A truck or mini-truck is recommended.`
                )
              } else {
                setBookingError("")
              }
            } catch (err) {
              console.warn("Cargo fitment check failed:", err)
            }
          } else {
            setBookingError("")
          }
        }}
        isTwoWheeler={true}
        selectedCategory={selectedGoodsCategoryObj}
        onSelectCategory={setSelectedGoodsCategoryObj}
      />

      {/* ── Looking for partner... Screen (CalServices Green Logistics Branding) ─────────────── */}
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
                    {/* Goods Type */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-500">Goods Type</span>
                      <span className="font-bold text-emerald-800">{selectedGoodsType || "General Goods"}</span>
                    </div>
                    {/* Amount */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                        <span className="text-base">💵</span> Amount Payable
                      </div>
                      <span className="text-sm font-extrabold text-slate-900">
                        {lastBookingAmount != null
                          ? `₹ ${Number(lastBookingAmount).toLocaleString("en-IN")}`
                          : (serverQuote?.total != null
                            ? `₹ ${Number(serverQuote.total).toLocaleString("en-IN")}`
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
          currentDate={preferredDate || todayDateString()}
          currentTimeSlot={selectedSlot || "Morning"}
          onClose={() => setRescheduleModalOpen(false)}
          onRescheduled={({ new_date, new_time_slot }) => {
            setPreferredDate(new_date)
            setSelectedSlot(new_time_slot)
            setRescheduleModalOpen(false)
          }}
        />
      )}

      {/* ── Cancel Trip Modal (Matching Image 3) ── */}
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

      {/* ── Booking Cancelled Screen / Modal (Matching Image 2) ── */}
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
                        {((serverDates && serverDates.length > 0) ? serverDates : DELIVERY_DATES).map((dateObj) => (
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
                        <span className="text-[12px] font-bold text-orange-600">Slots Filling Fast, Book Now!</span>
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
                                    {slots.map((item) => {
                                      const slotLabel = typeof item === "string" ? item : (item.slot || item.label)
                                      const isAvail = typeof item === "object" && "is_available" in item
                                        ? item.is_available
                                        : (serverSlotsAvailability ? (serverSlotsAvailability[slotLabel] === true) : false)
                                      const passed = !isAvail
                                      const reason = (typeof item === "object" && item.reason) || (passed ? "Slot not available" : "")
                                      return (
                                        <button
                                          key={slotLabel}
                                          type="button"
                                          disabled={passed}
                                          title={reason || undefined}
                                          onClick={() => setSelectedSlot(slotLabel)}
                                          className={`py-2 px-1 rounded-xl border text-center transition-all ${selectedSlot === slotLabel
                                              ? "border-[#0B8860] bg-[#0B8860]/5 text-[#0B8860] font-bold shadow-sm"
                                              : passed
                                                ? "border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed pointer-events-none"
                                                : "border-slate-200 bg-white hover:border-slate-300 text-slate-600 font-medium cursor-pointer"
                                            }`}
                                        >
                                          <span className="text-[12px]">{slotLabel}</span>
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
                    <div className="absolute bottom-0 left-0 right-0 bg-white shadow-[0_-8px_20px_rgba(0,0,0,0.04)] px-6 py-4 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setStepperStep(4)}
                        disabled={!selectedDate || !selectedSlot || (serverSlotsAvailability ? serverSlotsAvailability[selectedSlot] === false : false)}
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
                              <p className="text-[14px] text-slate-800 font-medium leading-relaxed">{pickup || `${currentCityName || "Hosur"} Origin`}</p>
                            </div>
                          </div>
                          {intermediateStops.filter((s) => s.address && s.address.trim()).map((stop, sIdx) => (
                            <div key={stop.id || sIdx} className="flex items-start gap-4 relative bg-white" data-testid="summary-stop">
                              <div className="mt-0.5 relative z-10 w-4 h-4 bg-white rounded-full flex items-center justify-center">
                                <MapPin className="w-3.5 h-3.5 text-blue-500" />
                              </div>
                              <div className="pt-0.5">
                                <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700 block">Stop {sIdx + 1}</span>
                                <p className="text-[14px] text-slate-800 font-medium leading-relaxed">{stop.address}</p>
                              </div>
                            </div>
                          ))}
                          <div className="flex items-start gap-4 relative bg-white">
                            <div className="mt-0.5 relative z-10 w-4 h-4 bg-white rounded-full flex items-center justify-center">
                              <MapPin className="w-3.5 h-3.5 text-rose-500" />
                            </div>
                            <div className="pt-0.5">
                              <p className="text-[14px] text-slate-800 font-medium leading-relaxed">{drop || (selectedRoute ? selectedRoute.to : "Destination")}</p>
                            </div>
                          </div>
                        </div>

                        {bookingMode === "IMMEDIATE" ? (
                          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                                <Zap className="w-4 h-4 text-[#0B8860]" />
                              </div>
                              <div>
                                <span className="text-[13px] text-slate-800 font-bold block">
                                  Immediate Dispatch (15–20 mins)
                                </span>
                                <span className="text-[11px] text-slate-500 font-medium">
                                  Nearest driver allocated right after booking
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setBookingMode("SCHEDULED")
                                if (!selectedDate) setSelectedDate((serverDates && serverDates.length > 0) ? serverDates[0] : DELIVERY_DATES[0])
                                setStepperStep(3)
                              }}
                              className="text-[12px] font-bold text-[#0B8860] border border-[#0B8860]/30 px-3.5 py-1.5 rounded-full hover:bg-[#0B8860]/5 transition-colors cursor-pointer"
                            >
                              Schedule for Later
                            </button>
                          </div>
                        ) : (
                          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                                <Calendar className="w-4 h-4 text-indigo-600" />
                              </div>
                              <div>
                                <span className="text-[13px] text-slate-800 font-bold block">
                                  Scheduled: {selectedDate ? `${selectedDate.value} | ` : ""}{selectedSlot || "Time not selected"}
                                </span>
                                <span className="text-[11px] text-slate-500 font-medium">
                                  Pickup scheduled for your chosen window
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setBookingMode("IMMEDIATE")
                                  setSelectedSlot(null)
                                  setSelectedDate(null)
                                }}
                                className="text-[12px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full hover:bg-amber-100 transition-colors cursor-pointer"
                              >
                                Switch to Immediate
                              </button>
                              <button
                                type="button"
                                onClick={() => setStepperStep(3)}
                                className="text-[12px] font-bold text-slate-600 border border-slate-200 px-3 py-1.5 rounded-full hover:bg-slate-50 transition-colors cursor-pointer"
                              >
                                Change Slot
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Selected Vehicle Card */}
                      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-20 h-14 flex items-center justify-center bg-slate-50 rounded-xl p-1">
                            {selectedVehicle?.diagram}
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900 text-sm">{selectedVehicle?.name || "Two Wheeler"}</h4>
                            <p className="text-xs text-slate-500 mt-0.5">{selectedVehicle?.capacity || ""}</p>
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

                      {/* Contact & Receiver Details Card */}
                      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold text-slate-800 text-base">Contact Details</h3>
                          <span className="text-[11px] font-medium text-slate-400">Driver coordination</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="flex flex-col text-left">
                            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                              Your Name *
                            </label>
                            <input
                              type="text"
                              placeholder="Full Name"
                              value={name}
                              onChange={(e) => {
                                setName(e.target.value)
                                if (bookingError) setBookingError("")
                              }}
                              className="w-full px-3 h-10 text-xs sm:text-sm bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-all text-slate-800 font-medium"
                              required
                            />
                          </div>

                          <div className="flex flex-col text-left">
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                Mobile Number *
                              </label>
                              <span className={`text-[10px] font-semibold tabular-nums ${phone.length === 10 ? "text-emerald-600" : phone.length > 0 ? "text-amber-500" : "text-slate-400"}`}>
                                {phone.length}/10
                              </span>
                            </div>
                            <input
                              type="tel"
                              inputMode="numeric"
                              maxLength={10}
                              placeholder="10-digit mobile number"
                              value={phone}
                              onChange={(e) => {
                                const digits = e.target.value.replace(/\D/g, "").slice(0, 10)
                                setPhone(digits)
                                if (bookingError) setBookingError("")
                              }}
                              className="w-full px-3 h-10 text-xs sm:text-sm bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-all text-slate-800 font-medium"
                              required
                            />
                          </div>
                        </div>

                        {/* Optional Receiver Details Toggle */}
                        <div className="pt-2 border-t border-slate-100">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs font-bold text-slate-700">Receiver at Drop Location</p>
                              <p className="text-[11px] text-slate-400">Driver calls receiver on delivery</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                // Bug found: "Remove" only toggled visibility without
                                // clearing receiverName/receiverPhone -- see the identical
                                // fix on this page's other receiver toggle and in
                                // MiniTruckBookingHosurPage.jsx for the full explanation.
                                // Clear the values when hiding.
                                const next = !showReceiverDetails
                                setShowReceiverDetails(next)
                                if (!next) {
                                  setReceiverName("")
                                  setReceiverPhone("")
                                  setReceiverPhoneError("")
                                }
                              }}
                              className="text-xs font-bold text-[#0B8860] hover:underline cursor-pointer"
                            >
                              {showReceiverDetails ? "Remove" : "+ Add Receiver"}
                            </button>
                          </div>

                          {showReceiverDetails && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-100">
                              <div className="flex flex-col text-left">
                                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                                  Receiver Name
                                </label>
                                <input
                                  type="text"
                                  placeholder="Receiver Name"
                                  value={receiverName}
                                  onChange={(e) => setReceiverName(e.target.value)}
                                  className="w-full px-3 h-10 text-xs sm:text-sm bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-all text-slate-800 font-medium"
                                />
                              </div>
                              <div className="flex flex-col text-left">
                                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                                  Receiver Mobile
                                </label>
                                <input
                                  type="tel"
                                  inputMode="numeric"
                                  maxLength={10}
                                  placeholder="10-digit mobile number"
                                  value={receiverPhone}
                                  onChange={(e) => {
                                    setReceiverPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
                                    if (receiverPhoneError) setReceiverPhoneError("")
                                  }}
                                  className="w-full px-3 h-10 text-xs sm:text-sm bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-all text-slate-800 font-medium"
                                />
                                {receiverPhoneError && (
                                  <p className="text-[10px] text-red-500 font-semibold mt-1">⚠ {receiverPhoneError}</p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Booking Error Banner */}
                      {bookingError && (
                        <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-xl flex items-start gap-2.5 text-rose-800 text-xs font-semibold">
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                          <span className="flex-1 leading-relaxed">{bookingError}</span>
                        </div>
                      )}
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-100 p-4 shadow-[0_-8px_20px_rgba(0,0,0,0.04)] flex items-center justify-between z-10">
                      <div>
                        <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider mb-0.5">Estimated Fare</p>
                        <p className="text-xl font-black text-slate-800">
                          {serverQuote?.total != null
                            ? `₹ ${Number(serverQuote.total).toLocaleString("en-IN")}`
                            : quoteLoading
                              ? "Calculating…"
                              : quoteError
                                ? "Fare unavailable"
                                : "—"}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5">Toll, parking &amp; approved extras are charged over and above this fare</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const cleanP = phone.replace(/\D/g, "").slice(0, 10)
                          if (!isSignedIn && (!name.trim() || cleanP.length !== 10)) {
                            setShowCustomerEntryModal(true)
                          } else {
                            submitBooking()
                          }
                        }}
                        disabled={bookingSubmitting || quoteLoading || serverQuote?.total == null}
                        className="px-10 py-3.5 bg-[#0B8860] hover:bg-[#097754] text-white text-[15px] font-bold rounded-xl transition-all shadow-md shadow-[#0B8860]/20 cursor-pointer disabled:opacity-60 flex items-center gap-2"
                      >
                        {bookingSubmitting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Confirming...</span>
                          </>
                        ) : (
                          "Confirm Booking"
                        )}
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
                      <p className="text-[12px] text-slate-700 font-medium leading-relaxed pt-0.5">{pickup || `${currentCityName || "Hosur"} Origin`}</p>
                    </div>
                    {intermediateStops.filter((s) => s.address && s.address.trim()).map((stop, sIdx) => (
                      <div key={stop.id || sIdx} className="flex items-start gap-4 relative bg-white" data-testid="summary-stop">
                        <div className="mt-0.5 relative z-10 w-4 h-4 bg-white rounded-full flex items-center justify-center">
                          <MapPin className="w-3.5 h-3.5 text-blue-500" />
                        </div>
                        <div className="pt-0.5">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700 block">Stop {sIdx + 1}</span>
                          <p className="text-[12px] text-slate-700 font-medium leading-relaxed">{stop.address}</p>
                        </div>
                      </div>
                    ))}
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
              {bookingMode === "SCHEDULED" ? "Booking Scheduled Successfully!" : "Booking Confirmed!"}
            </h3>
            <p className="text-sm font-semibold text-emerald-700 bg-emerald-50 py-2.5 px-4 rounded-xl mb-4">
              {bookingMode === "SCHEDULED"
                ? `Pickup scheduled for ${selectedDate?.value || "chosen date"} (${selectedSlot || "window"})`
                : "Our service partner will contact you shortly"}
            </p>

            <div className="bg-slate-50 rounded-2xl p-4 text-left text-xs space-y-2 border border-slate-200 mb-6">
              {lastBookingId && (
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Booking ID:</span>
                  <span className="font-bold text-emerald-700">{lastBookingId}</span>
                </div>
              )}
              {bookingMode === "SCHEDULED" && (
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Scheduled For:</span>
                  <span className="font-bold text-slate-900">{selectedDate?.value} · {selectedSlot}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Service:</span>
                <span className="font-bold text-slate-900">{selectedVehicle?.name || "2 Wheeler Delivery"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Pickup:</span>
                <span className="font-bold text-slate-900 text-right line-clamp-1">{pickup || `${currentCityName || "Hosur"} Area`}</span>
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
                <span className="text-slate-500 font-medium">Final Booking Amount:</span>
                <span className="font-extrabold text-emerald-700 text-sm">
                  {lastBookingAmount != null
                    ? `₹${Number(lastBookingAmount).toLocaleString("en-IN")}`
                    : (serverQuote?.total != null
                      ? `₹${Number(serverQuote.total).toLocaleString("en-IN")}`
                      : "Amount unavailable")}
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
          onComplete={(userData) => {
            setShowCustomerEntryModal(false)
            setLocalIsSignedIn(true)
            const resolvedName = (userData?.name || name || "").trim()
            const resolvedPhone = (userData?.phone || phone || "").replace(/\D/g, "").slice(0, 10)
            if (resolvedName) setName(resolvedName)
            if (resolvedPhone) setPhone(resolvedPhone)
            submitBooking(null, resolvedName, resolvedPhone)
          }}
        />
      )}

      {mapPickerTarget && (
        <MapPickerScreen
          initialCoords={
            mapPickerTarget === "pickup"
              ? (pickupCoords?.lat ? { lat: Number(pickupCoords.lat), lng: Number(pickupCoords.lng) } : null)
              : (dropCoords?.lat ? { lat: Number(dropCoords.lat), lng: Number(dropCoords.lng) } : null)
          }
          serviceSlug="goods_transport_two_wheeler"
          vehicleClass={(selectedVehicle || selectedVehicleEffective)?.vehicle_class || ""}
          onClose={() => setMapPickerTarget(null)}
          onConfirm={(resolvedAddr) => {
            const fullAddr = resolvedAddr?.formatted_address || resolvedAddr?.address || resolvedAddr?.name || "Selected Location"
            const lat = Number(resolvedAddr?.latitude ?? resolvedAddr?.lat)
            const lng = Number(resolvedAddr?.longitude ?? resolvedAddr?.lng)
            if (mapPickerTarget === "pickup") {
              setPickup(fullAddr)
              if (!isNaN(lat) && !isNaN(lng)) {
                setPickupCoords({ lat, lng, forAddress: fullAddr })
              }
            } else {
              setDrop(fullAddr)
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

export default TwoWheelerBookingHosurPage
