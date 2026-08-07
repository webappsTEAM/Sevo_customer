import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
  MapPin, ChevronDown, ChevronUp, ArrowRight, ShieldCheck,
  Clock, Package, Boxes, X, Sparkles, Navigation, Truck,
  CheckCircle2, Star, Phone, HelpCircle, Loader2, LocateFixed
} from "lucide-react"
import { routes } from "../routes.js"

/* ── Vehicle Dimension Diagrams matching Image 1 & Image 4 (Professional & Colorful) ── */
function ThreeWheelerDiagram({ className = "w-full max-w-[240px] h-[120px]" }) {
  return (
    <svg viewBox="0 0 260 130" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="tw-hood" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
        <linearGradient id="tw-body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
        <linearGradient id="tw-glass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e0f2fe" />
          <stop offset="100%" stopColor="#bae6fd" />
        </linearGradient>
      </defs>

      {/* Height Dimension (Left: 5ft) */}
      <text x="10" y="58" fill="#475569" fontSize="15" fontWeight="700" fontFamily="system-ui, sans-serif">5ft</text>
      <line x1="44" y1="26" x2="44" y2="86" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="3 2" />
      <line x1="39" y1="26" x2="49" y2="26" stroke="#64748b" strokeWidth="1.5" />
      <line x1="39" y1="86" x2="49" y2="86" stroke="#64748b" strokeWidth="1.5" />

      {/* Length Dimension (Top: 6ft) */}
      <text x="120" y="18" fill="#475569" fontSize="15" fontWeight="700" fontFamily="system-ui, sans-serif" textAnchor="middle">6ft</text>
      <line x1="56" y1="24" x2="186" y2="24" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="3 2" />
      <line x1="56" y1="19" x2="56" y2="29" stroke="#64748b" strokeWidth="1.5" />
      <line x1="186" y1="19" x2="186" y2="29" stroke="#64748b" strokeWidth="1.5" />

      {/* Ground Baseline & Soft Shadows */}
      <ellipse cx="94" cy="108" rx="16" ry="2.5" fill="#cbd5e1" opacity="0.6" />
      <ellipse cx="174" cy="108" rx="14" ry="2.5" fill="#cbd5e1" opacity="0.6" />
      <line x1="40" y1="108" x2="230" y2="108" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" />

      {/* 3 Wheeler Vehicle */}
      {/* Cargo Bed Body */}
      <rect x="56" y="52" width="76" height="28" rx="2" fill="#f8fafc" stroke="#1e293b" strokeWidth="2" />
      <rect x="56" y="74" width="76" height="6" fill="#10b981" />
      <line x1="56" y1="62" x2="132" y2="62" stroke="#cbd5e1" strokeWidth="1.5" />
      <line x1="56" y1="68" x2="132" y2="68" stroke="#cbd5e1" strokeWidth="1.5" />
      <path d="M70 80H122L116 88H76L70 80Z" fill="#334155" />

      {/* Front Cab Canopy & Body */}
      <path d="M132 40C132 40 150 40 156 46L166 66C168 70 168 78 164 82L160 88H132V40Z" fill="url(#tw-body)" stroke="#1e293b" strokeWidth="2" strokeLinejoin="round" />
      {/* Yellow Front Apron */}
      <path d="M152 56L166 66C168 70 168 78 164 82L160 88H152V56Z" fill="url(#tw-hood)" />
      {/* Windshield */}
      <path d="M136 44H148L156 62H136V44Z" fill="url(#tw-glass)" stroke="#0284c7" strokeWidth="1.5" />
      <line x1="140" y1="46" x2="152" y2="60" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
      {/* Headlight */}
      <circle cx="165" cy="72" r="3.5" fill="#fef08a" stroke="#d97706" strokeWidth="1.2" />

      {/* Rear Wheel */}
      <circle cx="94" cy="97" r="11" fill="#1e293b" />
      <circle cx="94" cy="97" r="6" fill="#e2e8f0" stroke="#64748b" strokeWidth="1.5" />
      <circle cx="94" cy="97" r="2.5" fill="#059669" />

      {/* Front Wheel */}
      <circle cx="174" cy="97" r="10" fill="#1e293b" />
      <circle cx="174" cy="97" r="5" fill="#e2e8f0" stroke="#64748b" strokeWidth="1.5" />
      <circle cx="174" cy="97" r="2" fill="#d97706" />
    </svg>
  )
}

function TataAceDiagram({ className = "w-full max-w-[240px] h-[120px]" }) {
  return (
    <svg viewBox="0 0 260 130" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="ace-cab" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#059669" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
        <linearGradient id="ace-glass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e0f2fe" />
          <stop offset="100%" stopColor="#bae6fd" />
        </linearGradient>
      </defs>

      {/* Height Dimension (Left: 6ft) */}
      <text x="10" y="58" fill="#475569" fontSize="15" fontWeight="700" fontFamily="system-ui, sans-serif">6ft</text>
      <line x1="44" y1="26" x2="44" y2="86" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="3 2" />
      <line x1="39" y1="26" x2="49" y2="26" stroke="#64748b" strokeWidth="1.5" />
      <line x1="39" y1="86" x2="49" y2="86" stroke="#64748b" strokeWidth="1.5" />

      {/* Length Dimension (Top: 7ft) */}
      <text x="135" y="18" fill="#475569" fontSize="15" fontWeight="700" fontFamily="system-ui, sans-serif" textAnchor="middle">7ft</text>
      <line x1="56" y1="24" x2="210" y2="24" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="3 2" />
      <line x1="56" y1="19" x2="56" y2="29" stroke="#64748b" strokeWidth="1.5" />
      <line x1="210" y1="19" x2="210" y2="29" stroke="#64748b" strokeWidth="1.5" />

      {/* Ground Baseline & Shadows */}
      <ellipse cx="86" cy="108" rx="16" ry="2.5" fill="#cbd5e1" opacity="0.6" />
      <ellipse cx="170" cy="108" rx="16" ry="2.5" fill="#cbd5e1" opacity="0.6" />
      <line x1="44" y1="108" x2="238" y2="108" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" />

      {/* Tata Ace Vehicle */}
      {/* Cargo Bed */}
      <rect x="56" y="58" width="84" height="22" rx="1.5" fill="#f8fafc" stroke="#1e293b" strokeWidth="2" />
      <rect x="56" y="58" width="84" height="4" fill="#10b981" />
      <line x1="56" y1="69" x2="140" y2="69" stroke="#cbd5e1" strokeWidth="1.5" />
      <rect x="56" y="74" width="6" height="4" fill="#ef4444" rx="0.5" />

      {/* Chassis Frame */}
      <rect x="56" y="80" width="130" height="5" fill="#334155" />

      {/* Front Cab */}
      <path d="M140 44C140 44 160 44 168 50L186 68C189 72 190 78 190 85H140V44Z" fill="url(#ace-cab)" stroke="#1e293b" strokeWidth="2" strokeLinejoin="round" />
      {/* Cab Windshield Glass */}
      <path d="M146 48H164L178 66H146V48Z" fill="url(#ace-glass)" stroke="#0284c7" strokeWidth="1.5" />
      <line x1="150" y1="50" x2="168" y2="64" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" opacity="0.85" />
      {/* Door Handle */}
      <rect x="148" y="71" width="5" height="2" rx="1" fill="#f8fafc" stroke="#047857" strokeWidth="0.5" />
      {/* Front Bumper & Headlight */}
      <path d="M190 80H196V86H188V80H190Z" fill="#1e293b" />
      <circle cx="186" cy="75" r="3" fill="#fef08a" stroke="#d97706" strokeWidth="1" />
      <rect x="187" y="78" width="2" height="3" fill="#f97316" rx="0.5" />

      {/* Rear Wheel */}
      <circle cx="86" cy="97" r="11" fill="#1e293b" />
      <circle cx="86" cy="97" r="6" fill="#e2e8f0" stroke="#64748b" strokeWidth="1.5" />
      <circle cx="86" cy="97" r="2.5" fill="#059669" />

      {/* Front Wheel */}
      <circle cx="170" cy="97" r="11" fill="#1e293b" />
      <circle cx="170" cy="97" r="6" fill="#e2e8f0" stroke="#64748b" strokeWidth="1.5" />
      <circle cx="170" cy="97" r="2.5" fill="#059669" />
    </svg>
  )
}

function Pickup8ftDiagram({ className = "w-full max-w-[240px] h-[120px]" }) {
  return (
    <svg viewBox="0 0 260 130" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="p8-box" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#f1f5f9" />
        </linearGradient>
        <linearGradient id="p8-cab" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#059669" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
        <linearGradient id="p8-stripe" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="70%" stopColor="#0d9488" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
        <linearGradient id="p8-glass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e0f2fe" />
          <stop offset="100%" stopColor="#bae6fd" />
        </linearGradient>
      </defs>

      {/* Height Dimension (Left: 5.5ft) */}
      <text x="6" y="58" fill="#475569" fontSize="15" fontWeight="700" fontFamily="system-ui, sans-serif">5.5ft</text>
      <line x1="46" y1="20" x2="46" y2="86" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="3 2" />
      <line x1="41" y1="20" x2="51" y2="20" stroke="#64748b" strokeWidth="1.5" />
      <line x1="41" y1="86" x2="51" y2="86" stroke="#64748b" strokeWidth="1.5" />

      {/* Length Dimension (Top: 8ft) */}
      <text x="130" y="16" fill="#475569" fontSize="15" fontWeight="700" fontFamily="system-ui, sans-serif" textAnchor="middle">8ft</text>
      <line x1="56" y1="22" x2="202" y2="22" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="3 2" />
      <line x1="56" y1="17" x2="56" y2="27" stroke="#64748b" strokeWidth="1.5" />
      <line x1="202" y1="17" x2="202" y2="27" stroke="#64748b" strokeWidth="1.5" />

      {/* Ground Baseline & Soft Shadows */}
      <ellipse cx="86" cy="108" rx="16" ry="2.5" fill="#cbd5e1" opacity="0.6" />
      <ellipse cx="166" cy="108" rx="16" ry="2.5" fill="#cbd5e1" opacity="0.6" />
      <line x1="44" y1="108" x2="238" y2="108" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" />

      {/* Closed Container Box */}
      <rect x="56" y="30" width="88" height="50" rx="2" fill="url(#p8-box)" stroke="#1e293b" strokeWidth="2" />
      {/* Decorative Logistics Brand Stripe */}
      <rect x="56" y="52" width="88" height="8" fill="url(#p8-stripe)" />
      <rect x="62" y="36" width="76" height="38" fill="none" stroke="#cbd5e1" strokeWidth="1.2" />
      <rect x="57" y="74" width="4" height="4" fill="#ef4444" rx="0.5" />
      <line x1="100" y1="30" x2="100" y2="80" stroke="#cbd5e1" strokeWidth="1.2" />

      {/* Chassis */}
      <rect x="56" y="80" width="128" height="5" fill="#334155" />

      {/* Front Cab */}
      <path d="M144 48C144 48 160 48 166 54L178 70C182 74 182 80 182 85H144V48Z" fill="url(#p8-cab)" stroke="#1e293b" strokeWidth="2" strokeLinejoin="round" />
      {/* Cab Windshield Glass */}
      <path d="M150 52H162L172 67H150V52Z" fill="url(#p8-glass)" stroke="#0284c7" strokeWidth="1.5" />
      <line x1="153" y1="54" x2="167" y2="65" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" opacity="0.85" />
      {/* Door handle */}
      <rect x="152" y="71" width="5" height="2" rx="1" fill="#f8fafc" stroke="#047857" strokeWidth="0.5" />
      {/* Front Bumper & Headlight */}
      <path d="M182 80H188V86H180V80H182Z" fill="#1e293b" />
      <circle cx="178" cy="74" r="3" fill="#fef08a" stroke="#d97706" strokeWidth="1" />

      {/* Rear Wheel */}
      <circle cx="86" cy="97" r="11" fill="#1e293b" />
      <circle cx="86" cy="97" r="6" fill="#e2e8f0" stroke="#64748b" strokeWidth="1.5" />
      <circle cx="86" cy="97" r="2.5" fill="#059669" />

      {/* Front Wheel */}
      <circle cx="166" cy="97" r="11" fill="#1e293b" />
      <circle cx="166" cy="97" r="6" fill="#e2e8f0" stroke="#64748b" strokeWidth="1.5" />
      <circle cx="166" cy="97" r="2.5" fill="#059669" />
    </svg>
  )
}

function OnePointSevenTonDiagram({ className = "w-full max-w-[240px] h-[120px]" }) {
  return (
    <svg viewBox="0 0 260 130" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="p17-cab" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
        <linearGradient id="p17-glass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e0f2fe" />
          <stop offset="100%" stopColor="#bae6fd" />
        </linearGradient>
      </defs>

      {/* Height Dimension (Left: 6.1ft) */}
      <text x="6" y="58" fill="#475569" fontSize="15" fontWeight="700" fontFamily="system-ui, sans-serif">6.1ft</text>
      <line x1="46" y1="26" x2="46" y2="86" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="3 2" />
      <line x1="41" y1="26" x2="51" y2="26" stroke="#64748b" strokeWidth="1.5" />
      <line x1="41" y1="86" x2="51" y2="86" stroke="#64748b" strokeWidth="1.5" />

      {/* Length Dimension (Top: 9ft) */}
      <text x="135" y="18" fill="#475569" fontSize="15" fontWeight="700" fontFamily="system-ui, sans-serif" textAnchor="middle">9ft</text>
      <line x1="52" y1="24" x2="218" y2="24" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="3 2" />
      <line x1="52" y1="19" x2="52" y2="29" stroke="#64748b" strokeWidth="1.5" />
      <line x1="218" y1="19" x2="218" y2="29" stroke="#64748b" strokeWidth="1.5" />

      {/* Ground Baseline & Shadows */}
      <ellipse cx="86" cy="108" rx="16" ry="2.5" fill="#cbd5e1" opacity="0.6" />
      <ellipse cx="186" cy="108" rx="16" ry="2.5" fill="#cbd5e1" opacity="0.6" />
      <line x1="40" y1="108" x2="242" y2="108" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" />

      {/* 1.7 Ton Heavy Bolero Pickup */}
      {/* Ribbed Cargo Bed */}
      <rect x="52" y="56" width="98" height="24" rx="1.5" fill="#f8fafc" stroke="#1e293b" strokeWidth="2" />
      <rect x="52" y="56" width="98" height="4" fill="#2563eb" />
      <line x1="52" y1="64" x2="150" y2="64" stroke="#cbd5e1" strokeWidth="1.5" />
      <line x1="52" y1="72" x2="150" y2="72" stroke="#cbd5e1" strokeWidth="1.5" />
      <rect x="53" y="73" width="5" height="4" fill="#ef4444" rx="0.5" />
      {/* Headache rack behind cab */}
      <path d="M146 46H150V56H146V46Z" fill="#1e293b" />

      {/* Chassis Frame */}
      <rect x="52" y="80" width="154" height="5" fill="#334155" />

      {/* Rugged Front Cab */}
      <path d="M150 48H172C174 48 176 50 177 52L181 60H204C206 60 208 62 208 64V85H150V48Z" fill="url(#p17-cab)" stroke="#1e293b" strokeWidth="2" strokeLinejoin="round" />
      {/* Cab Windshield Glass */}
      <path d="M156 52H170L176 60H156V52Z" fill="url(#p17-glass)" stroke="#0284c7" strokeWidth="1.5" />
      <line x1="158" y1="53" x2="172" y2="59" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" opacity="0.85" />
      {/* Door line and handle */}
      <line x1="176" y1="60" x2="176" y2="85" stroke="#1e40af" strokeWidth="1.5" />
      <rect x="160" y="66" width="5" height="2" rx="1" fill="#f8fafc" stroke="#1e40af" strokeWidth="0.5" />
      {/* Front Grille and Bumper */}
      <path d="M208 76H214C216 76 217 78 217 80V85H204V76H208Z" fill="#1e293b" />
      <circle cx="204" cy="68" r="3" fill="#fef08a" stroke="#d97706" strokeWidth="1" />
      <rect x="204" y="72" width="3" height="2" fill="#f97316" rx="0.5" />

      {/* Rear Wheel */}
      <circle cx="86" cy="97" r="11" fill="#1e293b" />
      <circle cx="86" cy="97" r="6" fill="#e2e8f0" stroke="#64748b" strokeWidth="1.5" />
      <circle cx="86" cy="97" r="2.5" fill="#2563eb" />

      {/* Front Wheel */}
      <circle cx="186" cy="97" r="11" fill="#1e293b" />
      <circle cx="186" cy="97" r="6" fill="#e2e8f0" stroke="#64748b" strokeWidth="1.5" />
      <circle cx="186" cy="97" r="2.5" fill="#2563eb" />
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
      {/* Top Left Marker */}
      <rect x="14" y="14" width="28" height="28" rx="4" fill="#0f172a" />
      <rect x="18" y="18" width="20" height="20" rx="2" fill="white" />
      <rect x="23" y="23" width="10" height="10" rx="1" fill="#0f172a" />
      {/* Top Right Marker */}
      <rect x="78" y="14" width="28" height="28" rx="4" fill="#0f172a" />
      <rect x="82" y="18" width="20" height="20" rx="2" fill="white" />
      <rect x="87" y="23" width="10" height="10" rx="1" fill="#0f172a" />
      {/* Bottom Left Marker */}
      <rect x="14" y="78" width="28" height="28" rx="4" fill="#0f172a" />
      <rect x="18" y="82" width="20" height="20" rx="2" fill="white" />
      <rect x="23" y="87" width="10" height="10" rx="1" fill="#0f172a" />
      {/* Matrix Data Blocks */}
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

/* ── Mini Truck Booking in Hosur Page ── */
export function MiniTruckBookingHosurPage() {
  const navigate = useNavigate()

  // Form State
  const [pickup, setPickup] = useState("")
  const [drop, setDrop] = useState("")
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [userType, setUserType] = useState("Personal Use / Shifting")
  const [estimateModalOpen, setEstimateModalOpen] = useState(false)
  const [selectedRoute, setSelectedRoute] = useState(null)

  // Live Location Detection State
  const [isDetectingLocation, setIsDetectingLocation] = useState(false)
  const [locationStatus, setLocationStatus] = useState("")

  // Truck tab selection
  const [activeTab, setActiveTab] = useState("light") // 'light' | 'heavy'
  const [activeVehicleDetails, setActiveVehicleDetails] = useState(null)

  // FAQ open states
  const [openFaq, setOpenFaq] = useState(null)

  useEffect(() => {
    window.scrollTo(0, 0)
    document.body.style.overflow = "unset"
  }, [])

  // Live location fetch handler (can be fetched live or entered manually)
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
          // Attempt reverse geocoding via photon
          const res = await fetch(`https://photon.komoot.io/reverse?lon=${longitude}&lat=${latitude}`)
          const data = await res.json()
          if (data && data.features && data.features.length > 0) {
            const p = data.features[0].properties
            const parts = [p.name, p.street, p.suburb || p.district, p.city || p.locality, p.state].filter(Boolean)
            const uniqueParts = parts.filter((v, i, a) => a.indexOf(v) === i)
            const formatted = uniqueParts.join(", ")
            setPickup(formatted || `Current Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`)
          } else {
            // Fallback via OpenStreetMap Nominatim
            const nomRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`)
            const nomData = await nomRes.json()
            if (nomData && nomData.display_name) {
              const parts = nomData.display_name.split(",").slice(0, 3).map((s) => s.trim()).join(", ")
              setPickup(parts)
            } else {
              setPickup(`Current Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`)
            }
          }
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
          alert("Location permission was denied. You can enter your pickup address manually.")
        } else {
          // Fallback location for testing
          setPickup("Current Location (Sipcot Phase 1, Hosur)")
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    )
  }

  // Vehicle Lists matching Image 1 (Light) & Image 4 (Heavy)
  const LIGHT_VEHICLES = [
    {
      id: "3wheeler",
      name: "3 Wheeler",
      capacity: "500kg",
      price: "₹160",
      diagram: <ThreeWheelerDiagram />,
      details: {
        name: "3 Wheeler Mini Cargo",
        capacity: "500 kg",
        dimensions: "5.5 ft x 4 ft x 4 ft (5ft height, 6ft length)",
        idealFor: "Small appliances, electronics, carton boxes, luggage shifting",
        baseFare: "₹160 (Includes first 1.0 km)"
      }
    },
    {
      id: "tata_ace",
      name: "Tata Ace",
      capacity: "750kg",
      price: "₹205",
      diagram: <TataAceDiagram />,
      details: {
        name: "Tata Ace (Chota Hathi)",
        capacity: "750 kg",
        dimensions: "7 ft x 4.5 ft x 5 ft (6ft height, 7ft length)",
        idealFor: "1 RK / 1 BHK furniture, home appliances, retail supply transport",
        baseFare: "₹205 (Includes first 1.0 km)"
      }
    }
  ]

  const HEAVY_VEHICLES = [
    {
      id: "pickup_8ft",
      name: "Pickup 8ft",
      capacity: "1250 kg",
      price: "₹300",
      diagram: <Pickup8ftDiagram />,
      details: {
        name: "Pickup 8ft (Closed Container)",
        capacity: "1250 kg",
        dimensions: "8 ft x 5 ft x 5.5 ft (5.5ft height, 8ft length)",
        idealFor: "Bulky electronics, commercial goods, furniture, home shifting",
        baseFare: "₹300 (Includes first 1.0 km)"
      }
    },
    {
      id: "1_7_ton",
      name: "1.7 ton",
      capacity: "1700 kg",
      price: "₹380",
      diagram: <OnePointSevenTonDiagram />,
      details: {
        name: "1.7 Ton Heavy Bolero Pickup",
        capacity: "1700 kg",
        dimensions: "9 ft x 5.5 ft x 6.1 ft (6.1ft height, 9ft length)",
        idealFor: "Heavy manufacturing loads, industrial raw materials, large 2 BHK relocation",
        baseFare: "₹380 (Includes first 1.0 km)"
      }
    }
  ]

  // Routes from Hosur (Explicitly specified by User)
  const LONG_DISTANCE_ROUTES = [
    { to: "Bengaluru", distance: "40 Kms", fare: "₹900", time: "~1.5 hrs" },
    { to: "Krishnagiri", distance: "55 Kms", fare: "₹1200", time: "~1.2 hrs" },
    { to: "Salem", distance: "155 Kms", fare: "₹3000", time: "~3.5 hrs" },
    { to: "Chennai", distance: "310 Kms", fare: "₹6200", time: "~6.5 hrs" },
    { to: "Coimbatore", distance: "310 Kms", fare: "₹6000", time: "~6.0 hrs" },
    { to: "Dharmapuri", distance: "85 Kms", fare: "₹1800", time: "~2.0 hrs" },
    { to: "Vellore", distance: "140 Kms", fare: "₹2800", time: "~3.0 hrs" },
    { to: "Tiruvannamalai", distance: "170 Kms", fare: "₹3400", time: "~3.8 hrs" },
    { to: "Madurai", distance: "380 Kms", fare: "₹7500", time: "~7.5 hrs" },
  ]

  // Hosur Areas We Serve
  const HOSUR_AREAS = [
    "Sipcot Phase 1", "Sipcot Phase 2", "Bagalur Road", "Mathigiri",
    "Zuzuvadi", "Avalapalli", "Moranapalli", "Mookandapalli",
    "Denkanikottai Road", "Rayakottai Road", "Thally Road", "Alasanatham",
    "Railway Station Area", "Dinnur", "Kelamangalam Road", "Kamaraj Nagar"
  ]

  // FAQs
  const FAQS = [
    {
      q: "What happens in case of an accident or breakdown during the transportation period?",
      a: "We provide comprehensive on-road transit support in and around Hosur. In the unlikely event of an issue, a backup vehicle is immediately dispatched from our local fleet hub to safely transfer goods without additional charges."
    },
    {
      q: "What should I consider when determining the truck size I need to book?",
      a: "Consider cargo dimensions, total weight, and loading height. For 1-2 small appliances or cartons, a 3-Wheeler (500kg) is best. For 1 BHK home shifting or factory supplies, choose a Tata Ace (750kg) or 8ft Pickup (1200kg)."
    },
    {
      q: "How do I track my mini truck delivery in real time?",
      a: "Once your mini truck booking in Hosur is confirmed and a driver arrives at the pickup point, live GPS tracking becomes active. You can track route progress and share live updates directly with the recipient."
    },
    {
      q: "Can I book a mini truck in advance in Hosur?",
      a: "Yes! You can schedule your mini truck up to 7 days in advance or request immediate on-demand dispatch within 15-20 minutes anywhere in Hosur and industrial SIPCOT corridors."
    }
  ]

  const handleRouteSelect = (route) => {
    setPickup("Sipcot Industrial Area, Hosur")
    setDrop(`${route.to}, Tamil Nadu`)
    setSelectedRoute(route)
    const bar = document.getElementById("estimate-bar")
    if (bar) bar.scrollIntoView({ behavior: "smooth", block: "center" })
  }

  const handleGetEstimate = (e) => {
    if (e) e.preventDefault()
    setEstimateModalOpen(true)
  }

  return (
    <div className="min-h-screen bg-[#FAFCFB] text-slate-800 font-sans antialiased">
      {/* ── Top Header Navigation ──────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(routes.landing)}>
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm">
              <Truck className="w-5 h-5" strokeWidth={2.5} />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-extrabold tracking-tight text-slate-900 leading-none">
                CalServices
              </span>
              <span className="text-[10px] font-semibold text-emerald-700 tracking-wide uppercase mt-0.5">
                Logistics &amp; Trucks
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

      {/* ── Hero Section (Page 1) ──────────────────────────────── */}
      <section className="relative pt-10 pb-8 sm:pt-14 sm:pb-12 bg-gradient-to-b from-emerald-50/50 via-[#FAFCFB] to-[#FAFCFB] border-b border-slate-100/60">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100/70 text-emerald-800 text-xs font-bold tracking-wide mb-4">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            Hosur Mini Truck Service
          </div>

          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight max-w-3xl mx-auto">
            Affordable and Trusted Mini Truck Booking in Hosur
          </h1>

          <p className="mt-4 text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Whether you're relocating, transporting furniture, or delivering commercial goods, our mini truck booking service in Hosur offers reliable, safe, and cost-effective transportation
          </p>

          <div className="mt-5 flex items-center justify-center gap-3 text-xs font-semibold text-emerald-700">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> On-Demand in 15 mins
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> Verified Drivers
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4 text-emerald-600" /> Transparent Pricing
            </span>
          </div>
        </div>

        {/* ── Quick Estimate Bar (Page 1) ──────────────────────── */}
        <div id="estimate-bar" className="max-w-7xl mx-auto px-4 sm:px-6 mt-8">
          <form
            onSubmit={handleGetEstimate}
            className="bg-white rounded-2xl sm:rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200/80 p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-3.5 items-end"
          >
            {/* Pickup */}
            <div className="flex flex-col text-left">
              <div className="h-5 mb-1.5 flex items-center justify-between">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1 whitespace-nowrap">
                  <span className="text-emerald-600">●</span> Pickup Address *
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
                  placeholder="Enter pickup location"
                  value={pickup}
                  onChange={(e) => setPickup(e.target.value)}
                  className="w-full pl-3 pr-8 h-10 sm:h-11 text-xs sm:text-sm bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-all text-slate-800 font-medium"
                  required
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
            </div>

            {/* Drop */}
            <div className="flex flex-col text-left">
              <div className="h-5 mb-1.5 flex items-center">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1 whitespace-nowrap">
                  <span className="text-rose-500">●</span> Drop Address *
                </label>
              </div>
              <input
                type="text"
                placeholder="Sending to (e.g. Bengaluru)"
                value={drop}
                onChange={(e) => setDrop(e.target.value)}
                className="w-full px-3 h-10 sm:h-11 text-xs sm:text-sm bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-all text-slate-800 font-medium"
                required
              />
            </div>

            {/* Name */}
            <div className="flex flex-col text-left">
              <div className="h-5 mb-1.5 flex items-center">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                  Name *
                </label>
              </div>
              <input
                type="text"
                placeholder="Enter your Name"
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
                  Phone Number *
                </label>
              </div>
              <input
                type="tel"
                placeholder="Enter Phone Number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 h-10 sm:h-11 text-xs sm:text-sm bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-all text-slate-800 font-medium"
                required
              />
            </div>

            {/* Describe You Best */}
            <div className="flex flex-col text-left">
              <div className="h-5 mb-1.5 flex items-center">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                  What describes you best *
                </label>
              </div>
              <select
                value={userType}
                onChange={(e) => setUserType(e.target.value)}
                className="w-full px-3 h-10 sm:h-11 text-xs sm:text-sm bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-all text-slate-800 font-medium cursor-pointer"
              >
                <option>Personal Use / Shifting</option>
                <option>Business / Enterprise</option>
                <option>Trader / Shopkeeper</option>
                <option>Manufacturer / Factory</option>
              </select>
            </div>

            {/* Submit Button */}
            <div className="flex flex-col justify-end">
              <div className="h-5 mb-1.5 hidden lg:block" />
              <button
                type="submit"
                className="w-full h-10 sm:h-11 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-extrabold text-xs sm:text-sm rounded-xl transition-all shadow-md shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
              >
                <span>Get Estimate</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* ── Section: Book Mini Trucks in Hosur (Matching Image 1 & 4) ── */}
      <section className="py-12 sm:py-16 max-w-5xl mx-auto px-4 sm:px-6">
        <div className="text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Book Mini Trucks in Hosur
          </h2>

          {/* Underline Tabs matching Image 1 & 4 */}
          <div className="flex items-center justify-center border-b border-slate-200 mt-6 max-w-md mx-auto">
            <button
              type="button"
              onClick={() => setActiveTab("light")}
              className={`pb-3 px-6 text-sm sm:text-base font-bold transition-all cursor-pointer relative ${
                activeTab === "light"
                  ? "text-slate-900 border-b-2 border-slate-900 -mb-[1px]"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Light (below 750kg)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("heavy")}
              className={`pb-3 px-6 text-sm sm:text-base font-bold transition-all cursor-pointer relative ${
                activeTab === "heavy"
                  ? "text-slate-900 border-b-2 border-slate-900 -mb-[1px]"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Heavy (above 750kg)
            </button>
          </div>
        </div>

        {/* 2 Centered Cards matching Image 1 (Light) & Image 4 (Heavy) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto mt-8 items-stretch">
          {(activeTab === "light" ? LIGHT_VEHICLES : HEAVY_VEHICLES).map((vehicle) => (
            <div
              key={vehicle.id}
              className="bg-white rounded-xl border border-slate-200/90 p-6 sm:p-7 flex flex-col items-center text-center shadow-none hover:border-slate-300 transition-all justify-between"
            >
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
                <p className="text-sm text-slate-600 mt-1">
                  Starting from <span className="font-bold text-slate-900 text-base">{vehicle.price}</span>
                </p>
              </div>

              {/* Know More dotted link */}
              <button
                type="button"
                onClick={() => setActiveVehicleDetails(vehicle.details)}
                className="text-xs sm:text-sm font-bold text-blue-600 hover:text-blue-700 border-b border-dotted border-blue-600 hover:border-blue-700 mt-5 cursor-pointer pb-0.5 inline-block focus:outline-none"
              >
                Know More
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ── Section: Popular Long Distance Routes from Hosur (User Requested) ── */}
      <section className="py-12 sm:py-16 bg-slate-50/80 border-y border-slate-200/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Popular Long Distance Routes from Hosur
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Guaranteed lowest rates with transparent per-kilometer pricing across Tamil Nadu &amp; Karnataka
            </p>
          </div>

          <div className="bg-[#EFF6FF]/60 border border-blue-100 rounded-3xl p-5 sm:p-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {LONG_DISTANCE_ROUTES.map((route, idx) => (
                <div
                  key={idx}
                  onClick={() => handleRouteSelect(route)}
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

      {/* ── Section: Areas We Serve in Hosur (Page 2) ─────────── */}
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

      {/* ── Section: Think Logistics, Think CalServices! (Page 2) ── */}
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
              Get the CalServices mobile app to start booking your mini trucks, track live deliveries, and manage invoices with a single tap.
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

      {/* ── Section: Other Services to Choose From (Page 2) ───── */}
      <section className="py-12 sm:py-16 max-w-4xl mx-auto px-4 sm:px-6 text-center">
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mb-8">
          Other Services to Choose From
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div
            onClick={() => navigate(routes.landing)}
            className="bg-white rounded-3xl p-6 border border-slate-200 hover:border-emerald-500 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col items-center"
          >
            <div className="w-20 h-20 rounded-2xl bg-amber-50 flex items-center justify-center mb-4">
              <Boxes className="w-10 h-10 text-amber-600" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Packers and Movers</h3>
            <p className="text-xs text-slate-500 mt-1">Complete household &amp; office relocation in Hosur</p>
          </div>

          <div
            onClick={() => navigate(routes.landing)}
            className="bg-white rounded-3xl p-6 border border-slate-200 hover:border-emerald-500 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col items-center"
          >
            <div className="w-20 h-20 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
              <Navigation className="w-10 h-10 text-blue-600" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Two Wheelers</h3>
            <p className="text-xs text-slate-500 mt-1">Instant package &amp; document delivery across town</p>
          </div>
        </div>
      </section>

      {/* ── Section: Truck for Goods Transportation in Hosur (Page 2) ── */}
      <section className="py-12 bg-white border-y border-slate-200/70">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mb-4">
            Truck for Goods Transportation in Hosur
          </h2>
          <div className="text-xs sm:text-sm text-slate-600 leading-relaxed space-y-3">
            <p>
              Transport your goods hassle-free with CalServices! Download CalServices and book a truck to transport business or personal goods anywhere in Hosur.
            </p>
            <p>
              CalServices offers cost-effective solutions, allowing you to shift items within your budget. You can count on CalServices to move your goods safely and reliably. With a truck just a few taps away, say goodbye to logistics hassles and trust CalServices for your transportation needs.
            </p>
            <p className="font-semibold text-slate-800">
              Book now and experience smooth, affordable, and efficient goods transportation with CalServices in Hosur!
            </p>
          </div>
        </div>
      </section>

      {/* ── Section: Frequently Asked Questions (Page 3) ──────── */}
      <section className="py-12 sm:py-16 max-w-4xl mx-auto px-4 sm:px-6">
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight text-center mb-8">
          Frequently Asked Questions
        </h2>

        <div className="space-y-3">
          {FAQS.map((faq, idx) => {
            const isOpen = openFaq === idx
            return (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 font-bold text-sm sm:text-base text-slate-800 hover:text-emerald-700 transition-colors cursor-pointer"
                >
                  <span>{faq.q}</span>
                  {isOpen ? (
                    <ChevronUp className="w-5 h-5 text-emerald-600 shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />
                  )}
                </button>
                {isOpen && (
                  <div className="px-5 pb-4 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* ── Vehicle Specs Modal ───────────────────────────────── */}
      {activeVehicleDetails && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setActiveVehicleDetails(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 relative"
          >
            <button
              onClick={() => setActiveVehicleDetails(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-lg font-extrabold text-slate-900">{activeVehicleDetails.name}</h3>
            <div className="mt-4 space-y-2.5 text-xs text-slate-600">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="font-semibold text-slate-500">Payload Capacity:</span>
                <span className="font-bold text-slate-800">{activeVehicleDetails.capacity}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="font-semibold text-slate-500">Dimensions:</span>
                <span className="font-bold text-slate-800">{activeVehicleDetails.dimensions}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="font-semibold text-slate-500">Estimated Base Fare:</span>
                <span className="font-bold text-emerald-700">{activeVehicleDetails.baseFare}</span>
              </div>
              <div className="py-1.5">
                <span className="font-semibold text-slate-500 block mb-1">Recommended Usage:</span>
                <p className="text-slate-700 bg-slate-50 p-2.5 rounded-xl">{activeVehicleDetails.idealFor}</p>
              </div>
            </div>
            <button
              onClick={() => {
                setActiveVehicleDetails(null)
                setEstimateModalOpen(true)
              }}
              className="w-full mt-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-colors cursor-pointer"
            >
              Proceed to Book
            </button>
          </div>
        </div>
      )}

      {/* ── Instant Fare Breakdown Modal ───────────────────────── */}
      {estimateModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setEstimateModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative"
          >
            <button
              onClick={() => setEstimateModalOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-700">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">Instant Estimate</h3>
                <p className="text-xs text-slate-500">Hosur Mini Truck Service</p>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl space-y-2 text-xs mb-4">
              <div className="flex justify-between">
                <span className="text-slate-500">Pickup:</span>
                <span className="font-bold text-slate-800">{pickup || "Hosur, Tamil Nadu"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Drop:</span>
                <span className="font-bold text-slate-800">{drop || (selectedRoute ? selectedRoute.to : "Bengaluru, Karnataka")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Customer:</span>
                <span className="font-bold text-slate-800">{name || "Valued Customer"} {phone ? `(${phone})` : ""}</span>
              </div>
            </div>

            <div className="border border-emerald-200 bg-emerald-50/60 p-4 rounded-2xl flex items-center justify-between mb-5">
              <div>
                <p className="text-xs text-emerald-800 font-semibold">Estimated Fare</p>
                <p className="text-2xl font-extrabold text-emerald-900">
                  {selectedRoute ? selectedRoute.fare : "₹900 - ₹1200"}
                </p>
                <p className="text-[10px] text-emerald-700">Includes fuel, driver charges &amp; toll estimate</p>
              </div>
              <span className="px-3 py-1 bg-emerald-600 text-white text-xs font-bold rounded-full">
                Instant Confirm
              </span>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setEstimateModalOpen(false)}
                className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Modify Details
              </button>
              <button
                type="button"
                onClick={() => {
                  setEstimateModalOpen(false)
                  navigate(routes.booking)
                }}
                className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/25 transition-colors cursor-pointer"
              >
                Confirm &amp; Book
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="bg-white border-t border-slate-200 pt-12 pb-8 text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            <div>
              <h4 className="font-bold text-slate-900 mb-3 text-sm">Company</h4>
              <ul className="space-y-2">
                <li><span className="hover:text-emerald-600 cursor-pointer">About Us</span></li>
                <li><span className="hover:text-emerald-600 cursor-pointer">Careers</span></li>
                <li><span className="hover:text-emerald-600 cursor-pointer">Blog</span></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 mb-3 text-sm">Quick Links</h4>
              <ul className="space-y-2">
                <li><span className="hover:text-emerald-600 cursor-pointer">Packers &amp; Movers</span></li>
                <li><span className="hover:text-emerald-600 cursor-pointer">Two Wheelers</span></li>
                <li><span className="hover:text-emerald-600 cursor-pointer">Trucks in Hosur</span></li>
                <li><span className="hover:text-emerald-600 cursor-pointer">Enterprise Logistics</span></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 mb-3 text-sm">Support</h4>
              <ul className="space-y-2">
                <li><span className="hover:text-emerald-600 cursor-pointer">Contact Us</span></li>
                <li><span className="hover:text-emerald-600 cursor-pointer">Privacy Policy</span></li>
                <li><span className="hover:text-emerald-600 cursor-pointer">Terms of Service</span></li>
                <li><span className="hover:text-emerald-600 cursor-pointer">Transit Insurance FAQ</span></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 mb-3 text-sm">Domestic Cities</h4>
              <p className="text-[11px] leading-relaxed text-slate-600">
                Hosur, Bengaluru, Chennai, Coimbatore, Salem, Dharmapuri, Krishnagiri, Vellore, Madurai, Hyderabad, Mumbai, Delhi NCR
              </p>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px]">
            <p>© 2026 CalServices Logistics Solutions Pvt. Ltd. All rights reserved.</p>
            <p>Affordable and Trusted Mini Truck Booking in Hosur</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default MiniTruckBookingHosurPage
