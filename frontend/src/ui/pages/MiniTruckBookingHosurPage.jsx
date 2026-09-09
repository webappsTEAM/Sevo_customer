import React, { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import {
  MapPin, ChevronDown, ChevronUp, ArrowRight, ShieldCheck,
  Clock, Package, Boxes, X, Sparkles, Navigation, Truck,
  CheckCircle2, Star, Phone, HelpCircle, Loader2, LocateFixed,
  User, Mail, MessageSquare, AlertCircle, Zap, Calendar, Check, Ban
} from "lucide-react"
import { routes } from "../routes.js"
import { fetchServiceTiers, fetchLanes, fetchServiceAreas, fetchLogisticsQuote } from "../../api/logisticsService.js"
import { createBooking, cancelBooking, getBookingStatus } from "../../api/bookingService.js"
import { todayDateString } from "../../components/logistics/LogisticsKit.jsx"
import { SupportHelpCenterModal } from "../components/SupportHelpCenterModal.jsx"
import { useAuth } from "../../state/auth/useAuth.js"
import { CustomerAccountModal } from "./BookingPage.jsx"
import { CustomerEntryFlowModal } from "../components/CustomerEntryFlowModal.jsx"
import { BookingCancellationModal } from "../components/BookingCancellationModal.jsx"
import { getAddress } from "../../api/geocoding.js"
import {
  HOSUR_LOCATIONS_DATABASE,
  filterLocationSuggestions,
  searchHosurPlacesOnline,
  formatExactLocation,
  isHosurRouteServed,
  resolveLocationCoords,
} from "../../services/hosurLocations.js"

const LOGISTICS_CITY = "hosur"

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

function TwoWheelerGraphic({ className = "w-28 h-20" }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Mint green ground shadow oval */}
      <ellipse cx="50" cy="80" rx="38" ry="5" fill="#dcfce7" />
      {/* Yellow delivery box on rear rack */}
      <rect x="22" y="28" width="22" height="20" rx="3" fill="#f59e0b" />
      <rect x="20" y="26" width="26" height="5" rx="2" fill="#fbbf24" />
      <rect x="30" y="34" width="6" height="8" rx="1" fill="#d97706" />
      {/* Blue Scooter/Motorcycle Chassis */}
      <path d="M36 48L50 48L60 60H40L36 48Z" fill="#1d4ed8" />
      <path d="M46 40L54 40L58 52L48 52Z" fill="#2563eb" />
      {/* Seat */}
      <path d="M32 46C32 43 36 42 42 42C48 42 52 45 52 47L32 47Z" fill="#1e293b" />
      {/* Handlebars & Fork */}
      <path d="M58 38L66 62" stroke="#64748b" strokeWidth="3" strokeLinecap="round" />
      <path d="M52 32C56 32 60 34 64 34L68 34" stroke="#334155" strokeWidth="3" strokeLinecap="round" />
      {/* Front Headlamp with yellow ring */}
      <circle cx="66" cy="40" r="7" fill="#3b82f6" />
      <circle cx="66" cy="40" r="5" fill="#fef08a" />
      <circle cx="66" cy="40" r="2.5" fill="#ffffff" opacity="0.9" />
      {/* Rear Wheel */}
      <circle cx="30" cy="66" r="13" fill="#1e293b" />
      <circle cx="30" cy="66" r="7" fill="#94a3b8" />
      <circle cx="30" cy="66" r="2.5" fill="#ffffff" />
      {/* Front Wheel */}
      <circle cx="66" cy="66" r="13" fill="#1e293b" />
      <circle cx="66" cy="66" r="7" fill="#94a3b8" />
      <circle cx="66" cy="66" r="2.5" fill="#ffffff" />
    </svg>
  )
}

function PackersMoversGraphic({ className = "w-28 h-20" }) {
  return (
    <svg viewBox="0 0 110 90" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Mint green ground shadow oval */}
      <ellipse cx="55" cy="74" rx="46" ry="5" fill="#dcfce7" />
      {/* Standing Floor Lamp on Left */}
      <path d="M26 22L34 34H18L26 22Z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1" />
      <line x1="26" y1="34" x2="26" y2="70" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
      <ellipse cx="26" cy="70" rx="6" ry="2" fill="#64748b" />
      {/* Light glow behind lamp */}
      <path d="M20 34L12 56H34L28 34Z" fill="#fef08a" opacity="0.3" />
      {/* Wooden Nightstand / Cardboard Box */}
      <rect x="22" y="48" width="18" height="20" rx="2" fill="#d97706" />
      <path d="M22 48L26 44H40L38 48H22Z" fill="#f59e0b" />
      <rect x="28" y="48" width="5" height="20" fill="#b45309" opacity="0.6" />
      {/* Royal Blue Sofa on Right */}
      <rect x="40" y="34" width="54" height="26" rx="6" fill="#1e40af" />
      <rect x="38" y="50" width="58" height="18" rx="5" fill="#2563eb" />
      <rect x="36" y="44" width="11" height="24" rx="4" fill="#3b82f6" />
      <rect x="87" y="44" width="11" height="24" rx="4" fill="#1d4ed8" />
      {/* Sofa legs */}
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

/* ── Maps backend ServiceTier.slug → the illustration for that vehicle.
   Diagrams stay local (purely cosmetic); everything else (name, capacity,
   price, description) now comes from GET /api/logistics/tiers/. ── */
const TRUCK_DIAGRAM_BY_SLUG = {
  "3-wheeler": <ThreeWheelerDiagram />,
  "tata-ace": <TataAceDiagram />,
  "pickup-8ft": <Pickup8ftDiagram />,
  "1-7-ton": <OnePointSevenTonDiagram />,
}

/* ── Slots & Dates Helper ── */
const DELIVERY_SLOTS = {
  "Morning": ["6AM-7AM", "7AM-8AM", "8AM-9AM", "9AM-10AM", "10AM-11AM", "11AM-12PM"],
  "Afternoon": ["12PM-1PM", "1PM-2PM", "2PM-3PM", "3PM-4PM", "4PM-5PM"],
  "Evening": ["5PM-6PM", "6PM-7PM", "7PM-8PM", "8PM-9PM", "9PM-10PM"]
}

const isSlotPassed = (slot, dateObj) => {
  const today = new Date()
  if (dateObj.toDateString() !== today.toDateString()) return false

  const parts = slot.split("-")
  if (parts.length < 2) return false
  const startTimeStr = parts[0].trim()
  
  const match = startTimeStr.match(/^(\d+)(AM|PM)$/i)
  if (!match) return false
  let hour = parseInt(match[1], 10)
  const ampm = match[2].toUpperCase()
  if (ampm === "PM" && hour < 12) hour += 12
  if (ampm === "AM" && hour === 12) hour = 0

  const slotStart = new Date(dateObj)
  slotStart.setHours(hour, 0, 0, 0)

  // Backend booking_window.py enforces minimum 60 minutes lead time from now
  const minLeadTime = new Date(today.getTime() + 60 * 60 * 1000)
  return slotStart < minLeadTime
}

const generateUpcomingDates = () => {
  const dates = []
  const today = new Date()
  
  const hasRemainingSlots = (dateObj) => {
    for (const slots of Object.values(DELIVERY_SLOTS)) {
      for (const slot of slots) {
        if (!isSlotPassed(slot, dateObj)) return true
      }
    }
    return false
  }

  let startOffset = 0
  if (!hasRemainingSlots(today)) {
    startOffset = 1
  }

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

const getFirstAvailableSlotAndCategory = (dateObj) => {
  for (const [category, slots] of Object.entries(DELIVERY_SLOTS)) {
    for (const slot of slots) {
      if (!isSlotPassed(slot, dateObj)) {
        return { category, slot }
      }
    }
  }
  return { category: "Morning", slot: "" }
}

const DELIVERY_DATES = generateUpcomingDates()

/* ── Mini Truck Booking in Hosur Page ── */
export function MiniTruckBookingHosurPage() {
  const navigate = useNavigate()

  // Form State
  const [pickup, setPickup] = useState("")
  const [drop, setDrop] = useState("")

  // Real geocoded coordinates for the pickup / drop the customer actually
  // picked. searchHosurPlacesOnline() already returns lat/lng on every
  // online suggestion (Google Geocoding, Photon and Nominatim all supply
  // it) and the live-GPS button already has exact device coordinates --
  // both were being thrown away, and every booking was submitted with the
  // same hardcoded Hosur town-centre point regardless of where the
  // customer said they were. That fake coordinate then drove the
  // server-side zone gate, technician dispatch and the live-tracking ETA.
  //
  // Each entry remembers the exact address string it was resolved FOR, so
  // any later change to that field (typing, picking a popular route, an
  // autofilled default) automatically invalidates it -- better to send no
  // coordinate and let the backend fall back than to attach a stale point
  // to an address the customer has since changed.
  const [pickupCoords, setPickupCoords] = useState(null) // { lat, lng, forAddress }
  const [dropCoords, setDropCoords] = useState(null)     // { lat, lng, forAddress }

  // Unique Idempotency Key per user booking attempt (reused on retry, reset on parameter change)
  const bookingAttemptKeyRef = useRef(null)

  // GT-B-01: the authoritative fare comes from the SERVER, never from this
  // component. The page previously derived a display price from the tier's
  // starting price while the backend computed the real fare at booking
  // time, so a customer could be shown one number and charged another.
  // serverQuote is what /logistics/quote/ returned for exactly the pickup,
  // drop and vehicle currently selected; it is null until all three are
  // known, and is cleared the moment any of them changes.
  const [serverQuote, setServerQuote] = useState(null)
  const [quoteLoading, setQuoteLoading] = useState(false)
  const [quoteError, setQuoteError] = useState("")
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [userType, setUserType] = useState("House Shifting & Personal Items")
  const [estimateModalOpen, setEstimateModalOpen] = useState(false)
  const [selectedRoute, setSelectedRoute] = useState(null)

  // Booking Flow State: Explicit separation between IMMEDIATE and SCHEDULED modes
  const [vehicleSelectorOpen, setVehicleSelectorOpen] = useState(false)
  const [selectedVehicle, setSelectedVehicle] = useState(null)
  const [slotStepperOpen, setSlotStepperOpen] = useState(false)
  const [stepperStep, setStepperStep] = useState(3)
  const [bookingMode, setBookingMode] = useState("IMMEDIATE") // "IMMEDIATE" | "SCHEDULED"
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [expandedSlotCategory, setExpandedSlotCategory] = useState("Morning")

  useEffect(() => {
    if (bookingMode === "SCHEDULED" && selectedDate?.fullDate) {
      const { category, slot } = getFirstAvailableSlotAndCategory(selectedDate.fullDate)
      setSelectedSlot(slot)
      setExpandedSlotCategory(category)
    }
  }, [selectedDate, bookingMode])

  useEffect(() => {
    bookingAttemptKeyRef.current = null
  }, [pickup, drop, selectedVehicle, bookingMode])
  const [bookingSuccessOpen, setBookingSuccessOpen] = useState(false)
  const [supportModalOpen, setSupportModalOpen] = useState(false)
  const [noServiceRoute, setNoServiceRoute] = useState(false)
  const { user } = useAuth()
  const [showAccountPortal, setShowAccountPortal] = useState(false)
  const [showCustomerEntryModal, setShowCustomerEntryModal] = useState(false)
  const [localIsSignedIn, setLocalIsSignedIn] = useState(false)
  const isSignedIn = Boolean(user) || localIsSignedIn

  // Goods Type & Looking for Partner Flow State (Matching Porter Application)
  const GOODS_TYPES = [
    "Timbers / Plywoods / Papers",
    "Electronics / Consumer Durables",
    "General Goods",
    "Building Materials",
    "Event Management / Hospitality",
    "Machines / Equipments / Spare Parts",
    "Textiles / Garments / Fashion Accessories",
    "Furnitures / Home Furnishings",
    "House Shifting / Packers and Movers",
    "Ceramic / Sanitary Wares",
    "Rubber Products",
    "Paints / Chemicals (Non-Hazardous)",
    "Homemade / Prepared Fresh Items",
    "Pharmaceutical / Healthcare Products",
    "FMCG Products",
    "Plastic Products",
    "Stationery / Gifts / Toys",
    "Hardwares",
    "Electrical",
  ]
  const [selectedGoodsType, setSelectedGoodsType] = useState("General Goods")
  const [goodsTypeModalOpen, setGoodsTypeModalOpen] = useState(false)
  const [lookingForPartnerOpen, setLookingForPartnerOpen] = useState(false)
  const [partnerCountdown, setPartnerCountdown] = useState(598) // 9:58 mins
  const [orderDetailsExpanded, setOrderDetailsExpanded] = useState(true)

  useEffect(() => {
    let interval = null
    if (lookingForPartnerOpen) {
      interval = setInterval(() => {
        setPartnerCountdown((prev) => (prev > 0 ? prev - 1 : 0))
      }, 1000)
    } else {
      setPartnerCountdown(598)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [lookingForPartnerOpen])



  const formatCountdown = (secs) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s < 10 ? "0" : ""}${s}`
  }

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
  const pickupWrapperRef = useRef(null)
  const dropWrapperRef = useRef(null)

  // Live Location Detection State
  const [isDetectingLocation, setIsDetectingLocation] = useState(false)
  const [locationStatus, setLocationStatus] = useState("")

  // Truck tab selection
  const [activeTab, setActiveTab] = useState("light") // 'light' | 'heavy'
  const [activeVehicleDetails, setActiveVehicleDetails] = useState(null)

  const [cancelModalOpen, setCancelModalOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState("")
  const [cancelComments, setCancelComments] = useState("")
  const [cancelSubmitting, setCancelSubmitting] = useState(false)
  const [cancelledBookingModalOpen, setCancelledBookingModalOpen] = useState(false)
  const [cancelledReasonText, setCancelledReasonText] = useState("")
  const [destinationError, setDestinationError] = useState("")

  // Lock body scroll when any modal or drawer is open to freeze background
  const isAnyModalOpen = Boolean(
    activeVehicleDetails ||
    vehicleSelectorOpen ||
    goodsTypeModalOpen ||
    lookingForPartnerOpen ||
    cancelModalOpen ||
    cancelledBookingModalOpen ||
    slotStepperOpen ||
    bookingSuccessOpen ||
    supportModalOpen ||
    estimateModalOpen ||
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

  // FAQ open states
  const [openFaq, setOpenFaq] = useState(null)

  // Catalog data — fetched from /api/logistics/ (backend/logistics app),
  // replacing what used to be hardcoded LIGHT_VEHICLES/HEAVY_VEHICLES/
  // LONG_DISTANCE_ROUTES/HOSUR_AREAS arrays.
  const [truckTiers, setTruckTiers] = useState([])
  const [truckLanes, setTruckLanes] = useState([])
  const [serviceAreas, setServiceAreas] = useState([])
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [bookingError, setBookingError] = useState("")
  const [bookingSubmitting, setBookingSubmitting] = useState(false)
  const [lastBookingId, setLastBookingId] = useState(null)
  const [lastTrackingToken, setLastTrackingToken] = useState(null)
  const [lastBookingAmount, setLastBookingAmount] = useState(null)
  const [showExitConfirm, setShowExitConfirm] = useState(false)

  // Recover active in-flight partner search if customer refreshes the page
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("calservice_active_partner_search")
      if (saved) {
        const parsed = JSON.parse(saved)
        const isFresh = Date.now() - (parsed.timestamp || 0) < 15 * 60 * 1000
        if (isFresh && parsed.bookingId && parsed.serviceCategory === "goods_transport_truck") {
          setLastBookingId(parsed.bookingId)
          if (parsed.trackingToken) setLastTrackingToken(parsed.trackingToken)
          if (parsed.amount != null) setLastBookingAmount(parsed.amount)
          setLookingForPartnerOpen(true)
        } else if (!isFresh) {
          sessionStorage.removeItem("calservice_active_partner_search")
        }
      }
    } catch (e) {}
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
            ["accepted", "on_the_way", "arrived", "in_progress"].includes(status)
          )
          if (isAccepted) {
            setLookingForPartnerOpen(false)
            try {
              sessionStorage.removeItem("calservice_active_partner_search")
            } catch (e) {}
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

  useEffect(() => {
    if (!lookingForPartnerOpen) return

    window.history.pushState(null, null, window.location.pathname)

    const handlePopState = () => {
      window.history.pushState(null, null, window.location.pathname)
      setShowExitConfirm(true)
    }

    window.addEventListener("popstate", handlePopState)
    return () => {
      window.removeEventListener("popstate", handlePopState)
    }
  }, [lookingForPartnerOpen])


  useEffect(() => {
    let cancelled = false
    async function loadCatalog() {
      try {
        const [tiers, lanes, areas] = await Promise.all([
          // The catalogue category is "truck" -- LogisticsCategory.TRUCK in
          // logistics/models.py, and what seed_logistics_hosur writes. This
          // asked for "mini_truck", which is not a category the backend
          // defines anywhere, so ServiceTierListView's filter(category=...)
          // matched nothing that a correctly seeded database contains. Any
          // tier that did come back was therefore a row whose category is not
          // "truck", and quoting it as goods_transport_truck is exactly what
          // assert_catalog_matches_category rejects with
          // TIER_CATEGORY_MISMATCH -- which then also fails the booking,
          // because both paths call the same guard.
          fetchServiceTiers("truck", LOGISTICS_CITY),
          fetchLanes("truck", LOGISTICS_CITY),
          fetchServiceAreas(LOGISTICS_CITY),
        ])
        if (cancelled) return
        if (Array.isArray(tiers) && tiers.length) setTruckTiers(tiers)
        if (Array.isArray(lanes) && lanes.length) setTruckLanes(lanes)
        if (Array.isArray(areas) && areas.length) setServiceAreas(areas)
      } catch (err) {
        console.warn("Failed to load logistics catalog, falling back to static data:", err)
      } finally {
        if (!cancelled) setCatalogLoading(false)
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
      const res = await searchHosurPlacesOnline(drop)
      setOnlineDropSuggestions(res || [])
      setIsSearchingOnlineDrop(false)
    }, 250)
    return () => clearTimeout(timer)
  }, [drop])

  // Debounced dynamic search for pickup location
  useEffect(() => {
    if (!pickup || pickup.trim().length < 2) {
      setOnlinePickupSuggestions([])
      return
    }
    const timer = setTimeout(async () => {
      const res = await searchHosurPlacesOnline(pickup)
      setOnlinePickupSuggestions(res || [])
    }, 250)
    return () => clearTimeout(timer)
  }, [pickup])

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

  // Only use a stored coordinate if it was resolved for the address being
  // used right now -- see the pickupCoords/dropCoords declaration above.
  const usableCoords = (coords, address) =>
    coords && coords.forAddress === address && coords.lat != null && coords.lng != null
      ? { lat: Number(coords.lat), lng: Number(coords.lng) }
      : null

  const pickupAddressValue = pickup || "Hosur, Tamil Nadu"
  const dropAddressValue = drop || (selectedRoute ? selectedRoute.to : "Channasandra, Bengaluru, Karnataka, India")
  const pickupPoint = usableCoords(pickupCoords, pickupAddressValue)
  const dropPoint = usableCoords(dropCoords, dropAddressValue)

  // GT-B-01: pickup -> drop -> vehicle -> server distance -> server fare.
  // Debounced so dragging through suggestions doesn't spend a metered
  // Distance Matrix call per keystroke, and guarded against out-of-order
  // responses so a slower earlier request can't overwrite a newer quote.
  useEffect(() => {
    const tierId = selectedVehicle?._tierId
    if (!pickupPoint || !dropPoint || !tierId) {
      setServerQuote(null)
      setQuoteError("")
      return
    }
    let cancelled = false
    setQuoteLoading(true)
    const timer = setTimeout(async () => {
      const res = await fetchLogisticsQuote({
        serviceCategory: "goods_transport_truck",
        tierId,
        pickup: pickupPoint,
        drop: dropPoint,
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
    // Depends on the primitive lat/lng values, deliberately NOT on the
    // pickupPoint/dropPoint objects react-hooks wants here: those are
    // rebuilt on every render, so listing them would re-run this effect
    // (and spend a metered Distance Matrix call) on every keystroke
    // anywhere on the page. The primitives are the actual inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    pickupPoint?.lat, pickupPoint?.lng, dropPoint?.lat, dropPoint?.lng,
    selectedVehicle?._tierId,
  ])

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
          const formatted = await getAddress(latitude, longitude)
          const resolved = formatted || `Current Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`
          setPickup(resolved)
          // Exact device GPS -- the most accurate pickup point we can get.
          setPickupCoords({ lat: latitude, lng: longitude, forAddress: resolved })
          setLocationStatus("Detected")
          setTimeout(() => setLocationStatus(""), 2500)
        } catch (err) {
          console.warn("Reverse geocoding error:", err)
          const resolved = `Current Location (Hosur - ${latitude.toFixed(4)}, ${longitude.toFixed(4)})`
          setPickup(resolved)
          // Reverse geocoding failed, but the GPS fix itself is still valid.
          setPickupCoords({ lat: latitude, lng: longitude, forAddress: resolved })
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
  // briefly unreachable. When the fetch succeeds, the backend-sourced
  // truckTiers/truckLanes/serviceAreas below take over.
  const VEHICLE_SUITABILITY_MAP = {
    "3-wheeler": {
      suitableFor: [
        "Groceries & provisions",
        "Small parcels & packages",
        "Clothing & cartons",
        "Small household items",
        "Small appliances",
        "Office supplies",
        "Local shop deliveries"
      ],
      bestFor: "Small and lightweight goods within Hosur."
    },
    "tata-ace": {
      suitableFor: [
        "Household furniture",
        "Home appliances",
        "Grocery & retail stock",
        "Multiple cartons",
        "Small business goods",
        "Electronics",
        "Small construction materials",
        "Shop/warehouse deliveries"
      ],
      bestFor: "Medium-sized household and commercial deliveries."
    },
    "pickup-8ft": {
      suitableFor: [
        "Sofas, beds & wardrobes",
        "Refrigerators & washing machines",
        "Furniture sets",
        "Bulk cartons",
        "Construction materials",
        "Business/industrial goods",
        "Machinery & equipment",
        "Warehouse stock"
      ],
      bestFor: "Larger and heavier household or commercial goods."
    },
    "1-7-ton": {
      suitableFor: [
        "Heavy furniture",
        "Large appliances",
        "Bulk construction materials",
        "Industrial equipment",
        "Machinery",
        "Large commercial stock",
        "Multiple cartons & packages",
        "Warehouse/industrial goods"
      ],
      bestFor: "Heavy and bulky goods requiring higher load capacity."
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
      diagram: TRUCK_DIAGRAM_BY_SLUG[tier.slug] || <ThreeWheelerDiagram />,
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

  const LIGHT_VEHICLES = truckTiers
    .filter((t) => t.weight_class === "light" && !t.slug.includes("2-wheeler") && t.category !== "two_wheeler")
    .map(tierToVehicle)
  const HEAVY_VEHICLES = truckTiers
    .filter((t) => t.weight_class === "heavy" && !t.slug.includes("2-wheeler") && t.category !== "two_wheeler")
    .map(tierToVehicle)

  const LONG_DISTANCE_ROUTES = truckLanes.map((lane) => ({
    to: lane.destination_label,
    distance: lane.distance_km ? `${Number(lane.distance_km)} Kms` : "",
    fare: `₹${Number(lane.fare).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`,
    time: lane.eta_label,
    _laneId: lane.id,
  }))

  const HOSUR_AREAS = serviceAreas.map((a) => a.name)

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

  const isRouteServed = (pickupVal, dropVal) => {
    return isHosurRouteServed(pickupVal, dropVal)
  }

  const handleGetEstimate = (e) => {
    if (e) e.preventDefault()
    if (!drop || !drop.trim()) {
      setDestinationError("Destination is not provided")
      const dropEl = document.getElementById("drop-input") || document.getElementById("estimate-bar")
      if (dropEl) {
        dropEl.scrollIntoView({ behavior: "smooth", block: "center" })
        dropEl.focus?.()
      }
      return
    }
    setDestinationError("")
    // Check if route is served
    if (pickup && drop && !isRouteServed(pickup, drop)) {
      setNoServiceRoute(true)
      return
    }
    setNoServiceRoute(false)
    setEstimateModalOpen(false)
    setVehicleSelectorOpen(true)
    // Pre-select the first vehicle
    const allVehicles = [...LIGHT_VEHICLES, ...HEAVY_VEHICLES]
    if (!selectedVehicle) setSelectedVehicle(allVehicles[0])
  }

  // Persists the booking to the backend (POST /api/booking/ — see
  // service_requests.BookingCreateView). Runs after OTP verification, or
  // immediately if the customer is already signed in.
  const submitBooking = async (goodsTypeOverride = null) => {
    setBookingError("")
    setBookingSubmitting(true)
    try {
      const vehicle = selectedVehicle || LIGHT_VEHICLES[0]
      const currentGoodsType = goodsTypeOverride || selectedGoodsType || "General Goods"
      // GT-B-01: submit the server's own quote when we have one. The
      // backend re-derives and validates the fare regardless (a
      // client-supplied total is never trusted for a logistics booking),
      // so this is about the customer being charged the number they were
      // actually shown -- not about the client deciding the price. The
      // tier-derived value remains only as a last-resort display default
      // for a trip we could not get a server quote for.
      // GT-B-01: the server quote is the ONLY fare authority for a logistics
      // booking. vehicle.price is the selector card's indicative "starting
      // from" label, not a price for THIS trip, and using it as a fallback
      // let the page submit a number no server ever produced -- which the
      // backend then rejected with an unresolved-fare 400 anyway. If there is
      // no quote there is no bookable fare; say so instead of inventing one.
      if (serverQuote?.total == null) {
        setBookingError(
          quoteError ||
            "We couldn't calculate a fare for this trip. Select the pickup and drop points from the suggestions, pick a vehicle, and try again."
        )
        return
      }
      const fare = Number(serverQuote.total)
      
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

      const customerEmail = user?.email || (typeof window !== "undefined" ? localStorage.getItem("caltrack_customer_email") : "") || ""

      // pickupAddressValue / dropAddressValue / pickupPoint / dropPoint are
      // computed once in the component body above and shared with the
      // quote effect, so the fare the customer was shown and the booking
      // submitted here are derived from exactly the same inputs.

      // No hardcoded fallback coordinate any more. If we could not resolve
      // where the pickup actually is, refuse rather than book the customer
      // at a made-up point -- the backend rejects a coordinate-less booking
      // for exactly this reason (see the HS-B-04 comment in
      // BookingCreateView), and a wrong coordinate is worse than none
      // because dispatch, routing and the fare all trust it.
      if (!pickupPoint) {
        setBookingSubmitting(false)
        setBookingError(
          "We couldn't pin your pickup location. Please pick it from the suggestions so we can find a driver near you."
        )
        return
      }

      if (!name || !name.trim()) {
        setBookingSubmitting(false)
        setBookingError("Please enter your name to complete the booking.")
        return
      }

      const cleanPhone = (phone || "").replace(/\D/g, "")
      if (!cleanPhone || cleanPhone.length < 10) {
        setBookingSubmitting(false)
        setBookingError("Please enter a valid 10-digit mobile number.")
        return
      }

      const payload = {
        customer_name: name.trim(),
        phone: cleanPhone,
        email: customerEmail,
        service_category: "goods_transport_truck",
        issue_title: `Mini truck delivery — ${vehicle?.name || "Mini Truck"} (${currentGoodsType})`,
        description: `Goods Type: ${currentGoodsType} | Type: ${userType}`,
        address: pickupAddressValue,
        drop_address: dropAddressValue,
        latitude: Number(Number(pickupPoint.lat).toFixed(6)),
        longitude: Number(Number(pickupPoint.lng).toFixed(6)),
        preferred_date: dateString,
        preferred_time: timeString,
        total_amount: fare,
        payment_method: "COD",
        cart_data: [{
          tier: vehicle?.name || "Mini Truck",
          price: fare,
          goods_type: currentGoodsType,
          route: selectedRoute?.to || null,
          date: bookingMode === "SCHEDULED" ? selectedDate?.value : null,
          slot: slotValue,
          booking_mode: bookingMode,
        }],
      }
      if (vehicle?._tierId) payload.logistics_tier = vehicle._tierId
      if (selectedRoute?._laneId) payload.logistics_lane = selectedRoute._laneId
      // Backend accepts these as optional; only send a real resolved point.
      if (dropPoint?.lat != null && dropPoint?.lng != null) {
        payload.drop_latitude = Number(Number(dropPoint.lat).toFixed(6))
        payload.drop_longitude = Number(Number(dropPoint.lng).toFixed(6))
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
            serviceCategory: "goods_transport_truck",
            timestamp: Date.now()
          }))
        } catch (e) {}
      }
    } catch (err) {
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
      try {
        sessionStorage.removeItem("calservice_active_partner_search")
      } catch (e) {}
      setCancelSubmitting(false)
      setCancelModalOpen(false)
      setLookingForPartnerOpen(false)
    }
  }

  const handleConfirmAndBook = () => {
    // Called from the Instant Estimate modal "Confirm & Book" -> Opens Date & Slot Stepper for scheduling
    setEstimateModalOpen(false)
    setVehicleSelectorOpen(false)
    if (!selectedVehicle) {
      setSelectedVehicle(LIGHT_VEHICLES[0])
    }
    setBookingMode("SCHEDULED")
    if (!selectedDate) setSelectedDate(DELIVERY_DATES[0])
    const defaultD = selectedDate?.fullDate || DELIVERY_DATES[0]?.fullDate || new Date()
    const { category, slot } = getFirstAvailableSlotAndCategory(defaultD)
    if (!selectedSlot) {
      setSelectedSlot(slot)
      setExpandedSlotCategory(category)
    }
    setStepperStep(3)
    setSlotStepperOpen(true)
  }

  const handleBookNow = () => {
    // Instant Booking: sets bookingMode to IMMEDIATE, clears any stale slot/date, moves to Step 4 Summary
    if (!pickup) setPickup("Hosur, Tamil Nadu")
    if (!drop && selectedRoute) setDrop(selectedRoute.to)
    if (!selectedVehicle) {
      setSelectedVehicle(LIGHT_VEHICLES[0])
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
    if (!pickup) setPickup("Hosur, Tamil Nadu")
    if (!drop && selectedRoute) setDrop(selectedRoute.to)
    if (!selectedVehicle) {
      setSelectedVehicle(LIGHT_VEHICLES[0])
    }
    setBookingMode("SCHEDULED")
    if (!selectedDate) setSelectedDate(DELIVERY_DATES[0])
    const defaultD = selectedDate?.fullDate || DELIVERY_DATES[0]?.fullDate || new Date()
    const { category, slot } = getFirstAvailableSlotAndCategory(defaultD)
    if (!selectedSlot) {
      setSelectedSlot(slot)
      setExpandedSlotCategory(category)
    }
    setVehicleSelectorOpen(false)
    setStepperStep(3)
    setSlotStepperOpen(true)
  }

  const handleLogoClick = () => {
    if (lookingForPartnerOpen) {
      setShowExitConfirm(true)
    } else {
      navigate(routes.landing)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--sevo-bg)] text-[var(--sevo-text-primary)] font-sans antialiased">
      {/* ── Top Header Navigation ──────────────────────────────── */}
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
                  } catch (e) {}
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
                Logistics &amp; Trucks
              </span>
            </div>
          </div>

          {/* Location Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--sevo-primary-light)] border border-[var(--sevo-primary)]/20 text-xs font-bold text-[var(--sevo-primary)]">
            <MapPin className="w-3.5 h-3.5 text-[var(--sevo-primary)]" />
            <span>Hosur</span>
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
                <span>{user.username || "Account"}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setEntryFlowOpen(true)}
                className="px-4 py-2 bg-[var(--sevo-primary)] hover:bg-[var(--sevo-primary-hover)] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer active:scale-95"
              >
                Login / Register
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Page Body */}
      <main className="pb-16">
        {/* ── Hosur Logistics Header ───────────────────────────── */}
        <section className="relative">
          <div className="bg-gradient-to-b from-[var(--sevo-surface)] to-[var(--sevo-surface-raised)]/40 border-b border-[var(--sevo-border)] py-8 sm:py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-[var(--sevo-primary-light)] text-[var(--sevo-primary)] border border-[var(--sevo-primary)]/20 uppercase tracking-wider mb-3">
              <Truck size={13} /> Hosur Local &amp; Intercity Transport
            </span>
            <h1 className="text-2xl sm:text-4xl font-black text-[var(--sevo-text-primary)] tracking-tight leading-tight mb-2">
              Book Mini Trucks in Hosur
            </h1>
            <p className="text-xs sm:text-base text-[var(--sevo-text-secondary)] font-medium max-w-xl mx-auto">
              Reliable doorstep pickup &amp; delivery across Hosur SIPCOT, Zuzuwadi, Bagalur, Mathigiri, and outer corridors.
            </p>
          </div>
        </div>

        {/* ── Quick Estimate Bar ──────────────────────── */}
        <div id="estimate-bar" className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 mt-8">
          <form
            onSubmit={handleGetEstimate}
            className="bg-[var(--sevo-surface)] rounded-2xl sm:rounded-3xl shadow-md border border-[var(--sevo-border)] p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3 sm:gap-3.5 items-start"
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
                            const exact = formatExactLocation(loc)
                            setPickup(exact)
                            // Most local database entries carry no lat/lng.
                            // Resolve them for real rather than falling back
                            // to a fixed town-centre point -- see
                            // resolveLocationCoords() for why that matters.
                            if (loc.lat != null && loc.lng != null) {
                              setPickupCoords({ lat: loc.lat, lng: loc.lng, forAddress: exact })
                            } else {
                              setPickupCoords(null)
                              resolveLocationCoords(loc).then((c) => {
                                if (c) setPickupCoords({ ...c, forAddress: exact })
                              })
                            }
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
                            setPickupCoords(null)
                            resolveLocationCoords(exact).then((c) => {
                              if (c) setPickupCoords({ ...c, forAddress: exact })
                            })
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
              <input
                id="drop-input"
                type="text"
                placeholder="Enter destination (e.g. Bengaluru)"
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
                  if (e.target.value.trim()) setDestinationError("")
                  setShowDropSuggestions(true)
                }}
                className={`w-full px-3 h-10 sm:h-11 text-xs sm:text-sm bg-slate-50 hover:bg-slate-100/80 focus:bg-white border rounded-xl focus:outline-none transition-all text-slate-800 font-medium ${
                  destinationError
                    ? "border-rose-500 ring-2 ring-rose-200 bg-rose-50/20 focus:border-rose-500"
                    : "border-slate-200 focus:border-emerald-500"
                }`}
                required
                autoComplete="off"
              />
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
                            if (loc.lat != null && loc.lng != null) {
                              setDropCoords({ lat: loc.lat, lng: loc.lng, forAddress: exact })
                            } else {
                              setDropCoords(null)
                              resolveLocationCoords(loc).then((c) => {
                                if (c) setDropCoords({ ...c, forAddress: exact })
                              })
                            }
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
                            setDropCoords(null)
                            resolveLocationCoords(exact).then((c) => {
                              if (c) setDropCoords({ ...c, forAddress: exact })
                            })
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

            {/* Name */}
            <div className="flex flex-col text-left">
              <div className="h-5 mb-1.5 flex items-center">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                  Customer Name *
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
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 h-10 sm:h-11 text-xs sm:text-sm bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-all text-slate-800 font-medium"
                required
              />
            </div>

            {/* Describe You Best */}
            <div className="flex flex-col text-left">
              <div className="h-5 mb-1.5 flex items-center">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                  Booking Category *
                </label>
              </div>
              <select
                value={userType}
                onChange={(e) => setUserType(e.target.value)}
                className="w-full px-3 h-10 sm:h-11 text-xs sm:text-sm bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-all text-slate-800 font-medium cursor-pointer"
              >
                <option value="House Shifting & Personal Items">House Shifting & Personal Items</option>
                <option value="Commercial & Business Cargo">Commercial & Business Cargo</option>
                <option value="Retail & Wholesale Goods">Retail & Wholesale Goods</option>
                <option value="Industrial & Factory Freight">Industrial & Factory Freight</option>
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

      {/* ── Section: Book Mini Trucks in Hosur (Matching Image 1 & 4) ── */}
      <section className="pt-6 sm:pt-8 pb-12 sm:pb-16 max-w-5xl mx-auto px-4 sm:px-6">
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

        {/* Coming Soon Notice Banner for Heavy Vehicles */}
        {activeTab === "heavy" && (
          <div className="max-w-xl mx-auto mt-4 px-4 py-2.5 bg-amber-50/90 border border-amber-200 rounded-xl flex items-center justify-center gap-2 text-amber-900 text-xs font-bold shadow-2xs">
            <span className="bg-amber-500 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-md tracking-wider shrink-0">
              Coming Soon
            </span>
            <span>These heavy vehicles are coming soon! Only Tata Ace &amp; 3-Wheeler (500kg) are currently available for booking.</span>
          </div>
        )}

        {destinationError && (
          <div className="max-w-2xl mx-auto mt-4 p-4 bg-rose-50 border-2 border-rose-200 text-rose-700 rounded-2xl text-xs font-bold flex items-center justify-between shadow-sm animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>Destination is not provided. Please enter a delivery destination in the form above to proceed with booking.</span>
            </div>
            <button
              type="button"
              onClick={() => {
                const dropEl = document.getElementById("drop-input") || document.getElementById("estimate-bar")
                if (dropEl) {
                  dropEl.scrollIntoView({ behavior: "smooth", block: "center" })
                  dropEl.focus?.()
                }
              }}
              className="underline font-black text-rose-800 hover:text-rose-950 cursor-pointer ml-3 shrink-0"
            >
              Enter Destination ↑
            </button>
          </div>
        )}
      </div>

      {/* Dynamic active vehicles based on category status */}
      {(() => {
        const currentVehicles = activeTab === "light" ? LIGHT_VEHICLES : HEAVY_VEHICLES
        if (currentVehicles.length === 0) {
          return (
            <div className="max-w-md mx-auto mt-8 p-6 bg-slate-50 border border-slate-200 rounded-2xl text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-3">
                <Truck className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-800 text-base">No Active Vehicles in this Tier</h3>
              <p className="text-xs text-slate-500 mt-1">
                {activeTab === "light" ? "Light commercial" : "Heavy commercial"} vehicles are currently inactive or undergoing maintenance.
              </p>
            </div>
          )
        }
        return (
          <div className={`grid ${currentVehicles.length === 1 ? 'grid-cols-1 max-w-md' : 'grid-cols-1 sm:grid-cols-2 max-w-2xl'} gap-6 mx-auto mt-8 items-stretch`}>
            {currentVehicles.map((vehicle) => {
              const isComingSoon = Boolean(
                (vehicle.badge && vehicle.badge.toLowerCase().includes("coming")) ||
                (!vehicle.badge && (activeTab === "heavy" || vehicle.name?.toLowerCase().includes("pickup") || vehicle.name?.toLowerCase().includes("1.7")))
              )
              const badgeToShow = vehicle.badge || (isComingSoon ? "Coming Soon" : "")
              return (
                <div
                  key={vehicle.id}
                  className={`bg-white rounded-xl border ${isComingSoon ? 'border-amber-200/80 bg-amber-50/10' : 'border-slate-200/90'} p-6 sm:p-7 flex flex-col items-center text-center shadow-none hover:border-slate-300 transition-all justify-between relative`}
                >
                  {/* Coming Soon or Highlight Badge */}
                  {badgeToShow ? (
                    <span
                      className={`absolute top-3.5 right-3.5 px-3 py-0.5 rounded-full text-[10px] font-extrabold border shadow-2xs ${
                        badgeToShow.toLowerCase().includes("coming")
                          ? "bg-amber-100 text-amber-900 border-amber-300 uppercase tracking-wider"
                          : badgeToShow.toLowerCase().includes("popular")
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : badgeToShow.toLowerCase().includes("rare")
                          ? "bg-slate-100 text-slate-700 border-slate-200"
                          : badgeToShow.toLowerCase().includes("best")
                          ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                          : badgeToShow.toLowerCase().includes("trend")
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : "bg-blue-50 text-blue-700 border-blue-200"
                      }`}
                    >
                      {badgeToShow.toLowerCase().includes("coming") ? "" : "★ "}
                      {badgeToShow}
                    </span>
                  ) : null}

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

                  {/* Know More underline link & Proceed to Booking button */}
                  <div className="w-full mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveVehicleDetails(vehicle.details)}
                      className="text-xs sm:text-sm font-bold text-emerald-700 hover:text-emerald-800 underline underline-offset-4 decoration-emerald-600 hover:decoration-emerald-700 cursor-pointer pb-0.5 inline-block focus:outline-none transition-colors"
                    >
                      Know More
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (vehicle.badge?.toLowerCase()?.includes("coming") || vehicle.name?.toLowerCase()?.includes("pickup") || vehicle.name?.toLowerCase()?.includes("1.7") || activeTab === "heavy") {
                          alert("This vehicle is coming soon! Tata Ace and 3-Wheeler are currently available.")
                          return
                        }
                        if (!drop || !drop.trim()) {
                          setDestinationError("Destination is not provided")
                          const dropEl = document.getElementById("drop-input") || document.getElementById("estimate-bar")
                          if (dropEl) {
                            dropEl.scrollIntoView({ behavior: "smooth", block: "center" })
                            dropEl.focus?.()
                          }
                          return
                        }
                        setDestinationError("")
                        setSelectedVehicle(vehicle)
                        if (!pickup) setPickup("Hosur, Tamil Nadu")
                        setNoServiceRoute(false)
                        setEstimateModalOpen(false)
                        setVehicleSelectorOpen(true)
                      }}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20 flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Proceed to Booking</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )
      })()}
      </section>


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

      {/* ── Section: Think Logistics, Think Sevo! (Page 2) ── */}
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
              Get the Sevo mobile app to start booking your mini trucks, track live deliveries, and manage invoices with a single tap.
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
          {/* Packers and Movers Card */}
          <div
            onClick={() => navigate(routes.packers_movers_booking_hosur)}
            className="bg-[#f0f3fa] rounded-3xl p-7 border border-slate-200/60 hover:shadow-lg transition-all cursor-pointer flex flex-col items-center gap-3 group"
          >
            <div className="h-24 flex items-center justify-center">
              <PackersMoversGraphic className="w-28 h-20 group-hover:scale-105 transition-transform" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Packers and Movers</h3>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); navigate(routes.packers_movers_booking_hosur) }}
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

      {/* ── Section: Truck for Goods Transportation in Hosur (Page 2) ── */}
      <section className="py-12 bg-white border-y border-slate-200/70">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mb-4">
            Truck for Goods Transportation in Hosur
          </h2>
          <div className="text-xs sm:text-sm text-slate-600 leading-relaxed space-y-3">
            <p>
              Transport your goods hassle-free with Sevo! Download Sevo and book a truck to transport business or personal goods anywhere in Hosur.
            </p>
            <p>
              Sevo offers cost-effective solutions, allowing you to shift items within your budget. You can count on Sevo to move your goods safely and reliably. With a truck just a few taps away, say goodbye to logistics hassles and trust Sevo for your transportation needs.
            </p>
            <p className="font-semibold text-slate-800">
              Book now and experience smooth, affordable, and efficient goods transportation with Sevo in Hosur!
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
            <h3 className="text-xl font-extrabold text-slate-900">{activeVehicleDetails.name}</h3>
            <p className="text-sm font-semibold text-slate-500 mt-1">{activeVehicleDetails.capacity}</p>

            <div className="mt-6">
              <span className="font-bold text-slate-900 block mb-3">Suitable for:</span>
              <ul className="space-y-2">
                {activeVehicleDetails.suitableFor?.map((item, idx) => (
                  <li key={idx} className="flex items-start text-sm text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mr-2 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <span className="font-bold text-slate-900">Best for: </span>
              <span className="text-sm text-slate-700">{activeVehicleDetails.bestFor}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Instant Fare Breakdown Modal (kept for vehicle detail 'Proceed to Book') ─── */}
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
                <span className="font-bold text-slate-800">{drop || (selectedRoute ? selectedRoute.to : "Not specified")}</span>
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
                  {serverQuote?.total != null
                    ? `₹ ${Number(serverQuote.total).toLocaleString("en-IN")}`
                    : (quoteLoading ? "Calculating…" : "Fare unavailable")}
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
                onClick={handleConfirmAndBook}
                disabled={bookingSubmitting}
                className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold text-xs shadow-md shadow-emerald-600/25 transition-colors cursor-pointer"
              >
                {bookingSubmitting ? "Confirming..." : "Confirm & Book"}
              </button>
            </div>
            {bookingError && (
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
                        <h2 className="text-xl font-bold text-slate-800">Confirm your shifting Date & Slot</h2>
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
                                  {slots.map(slot => {
                                    const passed = isSlotPassed(slot, selectedDate?.fullDate || new Date())
                                    return (
                                      <button
                                        key={slot}
                                        type="button"
                                        disabled={passed}
                                        onClick={() => setSelectedSlot(slot)}
                                        className={`py-2 px-1 rounded-xl border text-center transition-all ${
                                          selectedSlot === slot
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
                    </div>

                    {/* Step 3 Footer */}
                    <div className="absolute bottom-0 left-0 right-0 bg-white shadow-[0_-8px_20px_rgba(0,0,0,0.04)] px-6 py-4 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => {
                          setBookingMode("SCHEDULED")
                          setStepperStep(4)
                        }}
                        disabled={!selectedDate || !selectedSlot}
                        className="w-full py-3.5 bg-[#0B8860] hover:bg-[#097754] disabled:bg-[#CBD5E1] text-white text-[14px] font-bold rounded-xl transition-all shadow-md shadow-[#0B8860]/20 disabled:shadow-none cursor-pointer disabled:cursor-not-allowed"
                      >
                        Confirm Slot & View Summary
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
                                if (!selectedDate) setSelectedDate(DELIVERY_DATES[0])
                                const defaultD = DELIVERY_DATES[0]?.fullDate || new Date()
                                const { category, slot } = getFirstAvailableSlotAndCategory(defaultD)
                                setSelectedSlot(slot)
                                setExpandedSlotCategory(category)
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
                            <h4 className="font-bold text-slate-900 text-sm">{selectedVehicle?.name || "Vehicle"}</h4>
                            <p className="text-xs text-slate-500 mt-0.5">{selectedVehicle?.capacity || "Standard Capacity"}</p>
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
                        <p className="text-xl font-black text-slate-800">
                          {serverQuote?.total != null
                            ? `₹ ${Number(serverQuote.total).toLocaleString("en-IN")}`
                            : quoteLoading
                              ? "Calculating…"
                              : quoteError
                                ? "Fare unavailable"
                                : "—"}
                        </p>
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
                        disabled={bookingSubmitting || quoteLoading || serverQuote?.total == null}
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

      {/* ── Vehicle Selector Modal (Matching Porter App - Image 2) ─────────────────── */}
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
                    <p className="text-xs text-slate-500 leading-snug mt-0.5">{pickup || "Hosur, Tamil Nadu"}</p>
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
                
                {/* Drop */}
                <div className="flex items-start gap-3 mb-5">
                  <div className="mt-1 w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold text-slate-800 truncate">{name || "Customer"} • {phone || "Enter phone number"}</p>
                    <p className="text-xs text-slate-500 leading-snug mt-0.5">{drop || (selectedRoute ? selectedRoute.to : "Channasandra, Bengaluru, Karnataka, India")}</p>
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

                {/* Fare Breakdown -- GT-B-01.
                    Every line below is a value the SERVER returned for this
                    exact trip. This block used to compute its own: it took
                    the selector card's indicative "starting from" price,
                    added a hardcoded 29.89 "Trip Fare", subtracted a
                    hardcoded 30.00 discount attributed to an invented coupon
                    code, and presented the result as an Amount Payable. The
                    arithmetic was rigged so the total always landed back on
                    the card price, which made it look consistent while being
                    entirely unrelated to what the backend would charge -- and
                    it rendered a complete, confident fare breakdown even when
                    /logistics/quote/ had returned 400. There is no coupon
                    system in this flow, so no discount line is shown at all.
                    When there is no server quote there is no fare: say so. */}
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
                        <p className="flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin" /> Calculating your fare…</p>
                      </div>
                    )
                  }
                  if (!q || q.total == null) {
                    return (
                      <div className="border-t border-slate-200/80 pt-3 pb-2 text-xs">
                        <h4 className="text-xs font-bold text-slate-900 mb-2">Fare Breakdown</h4>
                        <p className="font-semibold text-slate-700">Fare unavailable</p>
                        <p className="text-slate-500 mt-0.5">
                          {quoteError ||
                            "We couldn't calculate a fare for this trip yet. Select the pickup and drop points from the suggestions and pick a vehicle."}
                        </p>
                      </div>
                    )
                  }
                  return (
                    <div className="border-t border-slate-200/80 pt-3 pb-2 space-y-1.5 text-xs text-slate-600">
                      <h4 className="text-xs font-bold text-slate-900 mb-2">Fare Breakdown</h4>
                      {positive(b?.base_fare) && (
                        <div className="flex justify-between">
                          <span>Base fare</span>
                          <span className="font-semibold text-slate-800">{money(b.base_fare)}</span>
                        </div>
                      )}
                      {positive(b?.distance_charge) && (
                        <div className="flex justify-between">
                          <span>
                            Distance charge
                            {b.chargeable_km != null ? ` (${b.chargeable_km} km chargeable)` : ""}
                          </span>
                          <span className="font-semibold text-slate-800">{money(b.distance_charge)}</span>
                        </div>
                      )}
                      {positive(b?.loading_unloading) && (
                        <div className="flex justify-between">
                          <span>Loading / unloading</span>
                          <span className="font-semibold text-slate-800">{money(b.loading_unloading)}</span>
                        </div>
                      )}
                      {positive(b?.additional_stops) && positive(b?.additional_stop_charge) && (
                        <div className="flex justify-between">
                          <span>Additional stops ({b.additional_stops})</span>
                          <span className="font-semibold text-slate-800">{money(b.additional_stop_charge)}</span>
                        </div>
                      )}
                      {b?.surge_multiplier != null && Number(b.surge_multiplier) !== 1 && (
                        <div className="flex justify-between">
                          <span>Surge ×{Number(b.surge_multiplier)}</span>
                          <span className="font-semibold text-slate-800">applied</span>
                        </div>
                      )}
                      {b?.minimum_fare_applied && (
                        <p className="text-[10px] text-slate-500">Minimum fare for this vehicle applied.</p>
                      )}
                      <div className="flex justify-between font-extrabold text-slate-900 text-sm pt-1 border-t border-slate-200">
                        <span>Amount Payable</span>
                        <span>{money(q.total)}</span>
                      </div>
                      {b?.distance_km != null && (
                        <p className="text-[10px] text-slate-400">
                          {b.distance_km} km
                          {b.distance_source === "straight_line_estimate" ? " (estimated route)" : ""}
                          {" · quoted by SEVO for this trip"}
                        </p>
                      )}
                    </div>
                  )
                })()}

                {/* Goods Type Row */}
                <div className="mt-3 p-3 rounded-2xl bg-white border border-slate-200 flex items-center justify-between shadow-2xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base">📦</span>
                    <div className="min-w-0">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">GOODS TYPE</p>
                      <p className="text-xs font-bold text-slate-800 truncate">{selectedGoodsType || "General Goods"}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setGoodsTypeModalOpen(true)}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer shrink-0"
                  >
                    Change
                  </button>
                </div>
              </div>

              {/* Action Buttons: Book Now & Schedule */}
              <div className="mt-4 flex flex-col gap-2">
                {/* GT-B-01: bookable only with an authoritative server fare.
                    serverQuote is set solely by the quote effect, which itself
                    requires a usable pickup point, a usable drop point and a
                    selected tier -- so a non-null total already implies every
                    prerequisite. Previously this button was live whatever the
                    quote did, so a customer whose quote had 400'd could press
                    Book Now and only discover the failure afterwards. */}
                <button
                  type="button"
                  onClick={() => submitBooking()}
                  disabled={bookingSubmitting || quoteLoading || serverQuote?.total == null}
                  title={
                    serverQuote?.total == null && !quoteLoading
                      ? "A fare is needed before booking"
                      : undefined
                  }
                  className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed text-white font-extrabold text-sm shadow-lg shadow-emerald-600/30 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {bookingSubmitting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Confirming...</>
                  ) : quoteLoading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Calculating fare…</>
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

                {/* GT-B-01: the authoritative, server-computed fare. This is
                    the number the booking will actually record -- the page
                    renders it, it does not calculate it. The per-vehicle
                    prices in the selector are indicative starting prices;
                    this is the quote for the trip actually entered. */}
                {(quoteLoading || serverQuote || quoteError) && (
                  <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/60 px-3 py-2.5">
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
                          </p>
                        )}
                      </>
                    )}
                    {!quoteLoading && !serverQuote && quoteError && (
                      <p className="text-[11px] font-semibold text-slate-600">{quoteError}</p>
                    )}
                  </div>
                )}
              </div>
              {/* A failed booking must be reported to whoever attempted it.
                  This was gated on isSignedIn, so a signed-out customer --
                  exactly the case where the 401/400 is most likely -- saw the
                  request fail with no message at all. */}
              {bookingError && (
                <p style={{ color: "var(--bad)", fontSize: 12, marginTop: 8, textAlign: "center" }}>{bookingError}</p>
              )}
            </div>

            {/* Right: Select Vehicle */}
            <div className="flex-1 flex flex-col p-5 sm:p-6 overflow-y-auto justify-between">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 mb-4">Select Vehicle</h3>
                <div className="space-y-2.5">
                  {LIGHT_VEHICLES.map((v) => {
                    const isSelected = (selectedVehicle?.id === v.id) || (!selectedVehicle && v.id === (LIGHT_VEHICLES[0]?.id || "3-wheeler"))
                    const fareRaw = Number(String(v.price).replace(/[^0-9.]/g, "")) || null
                    const fare = v.price || (fareRaw ? `₹ ${fareRaw.toLocaleString("en-IN")}` : "—")
                    // No fabricated "was" price. This was `fareRaw + 30`,
                    // which invented an original price by adding a hardcoded
                    // 30 to the card price and struck it through -- the same
                    // phantom ₹30 the removed "Coupon Discount - 2WLRBGLR34"
                    // line used. A discount is only real if a backend
                    // discount/coupon system produced it; there is none in
                    // this flow, so nothing is struck through.
                    const strikethrough = null
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setSelectedVehicle(v)}
                        className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 transition-all cursor-pointer text-left ${
                          isSelected
                            ? "border-emerald-600 bg-emerald-50/50 shadow-md shadow-emerald-100"
                            : "border-slate-200 bg-white hover:border-emerald-300 hover:bg-slate-50"
                        }`}
                      >
                        <div className="w-16 shrink-0 flex items-center justify-center">
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
                          <p className="text-sm font-extrabold text-slate-800">{fare}</p>
                          {strikethrough ? (
                            <span className="text-[10px] text-slate-400 line-through">{strikethrough}</span>
                          ) : null}
                        </div>
                      </button>
                    )
                  })}

                  {HEAVY_VEHICLES.map((v) => {
                    return (
                      <div
                        key={v.id}
                        className="w-full flex items-center gap-3 p-3.5 rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 text-left select-none"
                      >
                        <div className="w-16 shrink-0 flex items-center justify-center opacity-60">
                          {React.cloneElement(v.diagram, { className: "w-full h-14" })}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-slate-600">{v.name}</p>
                            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-300">
                              Coming Soon
                            </span>
                          </div>
                          <p className="text-xs text-slate-400">{v.capacity}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[11px] font-semibold text-slate-400 italic">Not available</span>
                        </div>
                      </div>
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
              {GOODS_TYPES.map((type) => {
                const isSelected = selectedGoodsType === type
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setSelectedGoodsType(type)
                      setGoodsTypeModalOpen(false)
                    }}
                    className={`w-full py-2.5 px-3 text-left text-xs font-semibold transition-all cursor-pointer flex items-center justify-between rounded-lg my-0.5 ${
                      isSelected
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
              })}
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

      {/* ── Looking for partner... Screen (CalServices Green Logistics Branding) ─────────────── */}
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
                          <p className="text-xs text-slate-500 leading-snug mt-0.5">{pickup || "Hosur, Tamil Nadu"}</p>
                        </div>
                      </div>
                      <div className="ml-[4px] w-[2px] h-3 bg-slate-300 border-l-2 border-dashed border-slate-400" />
                      {/* Drop */}
                      <div className="flex items-start gap-3">
                        <div className="mt-1 w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800">{name || "Customer"} • {phone || "Enter phone number"}</p>
                          <p className="text-xs text-slate-500 leading-snug mt-0.5">{drop || (selectedRoute ? selectedRoute.to : "Channasandra, Bengaluru, Karnataka, India")}</p>
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
                  <h4 className="text-2xl font-black leading-tight tracking-tight">Supercharge Your<br />Logistics!</h4>
                </div>
                <div className="bg-emerald-950/60 border border-emerald-400/40 rounded-xl px-2.5 py-1 text-right">
                  <p className="text-[10px] font-bold tracking-wider uppercase opacity-90">SEVO</p>
                  <p className="text-xs font-black text-amber-300">4.8 ★</p>
                </div>
              </div>

              <div className="space-y-3.5 my-3 text-xs font-semibold text-emerald-100">
                <div className="flex items-center gap-2.5">
                  <MapPin className="w-4 h-4 text-emerald-300 shrink-0" />
                  <span>In-Transit Updates</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-4 h-4 text-yellow-300 shrink-0" />
                  <span>Exciting Discounts & Rewards</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Zap className="w-4 h-4 text-emerald-300 shrink-0" />
                  <span>1-Tap Booking Options</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Truck className="w-4 h-4 text-emerald-300 shrink-0" />
                  <span>Loading & Unloading Service</span>
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

      {/* ── Booking Success Modal ─────────────────────────────────── */}
      {bookingSuccessOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setBookingSuccessOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-sm w-full p-8 shadow-2xl border border-slate-100 text-center relative"
          >
            <button
              onClick={() => setBookingSuccessOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            {/* Success icon */}
            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 mb-2">
              {bookingMode === "SCHEDULED" ? "Booking Scheduled Successfully!" : "Booking Confirmed!"}
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed mb-1">
              {bookingMode === "SCHEDULED" 
                ? "Your truck has been scheduled. Our partner will arrive on time." 
                : "Our service partner will contact you shortly."}
            </p>
            {lastBookingId && (
              <p className="text-xs font-bold text-emerald-700 mb-1">Booking ID: {lastBookingId}</p>
            )}
            <p className="text-xs text-slate-400 mb-6">
              {pickup && drop ? `${pickup} → ${drop}` : "Your booking has been placed successfully."}
            </p>
            <div className="bg-slate-50 rounded-2xl p-4 text-left text-xs space-y-2 border border-slate-200 mb-5">
              {bookingMode === "SCHEDULED" && (selectedDate || selectedSlot) && (
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Scheduled For:</span>
                  <span className="font-bold text-slate-900">{selectedDate?.date || selectedDate?.label || "Selected Date"} · {selectedSlot?.label || selectedSlot?.time || selectedSlot || ""}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Service:</span>
                <span className="font-bold text-slate-900">{selectedVehicle?.name || "Mini Truck Delivery"}</span>
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

      </main>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="bg-[var(--sevo-surface)] border-t border-[var(--sevo-border)] pt-12 pb-8 text-xs text-[var(--sevo-text-secondary)]">
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
                <li><span onClick={() => setSupportModalOpen(true)} className="hover:text-emerald-600 cursor-pointer">Contact Us</span></li>
                <li><span onClick={() => setSupportModalOpen(true)} className="hover:text-emerald-600 cursor-pointer">Help Center</span></li>
                <li><span className="hover:text-emerald-600 cursor-pointer">Privacy Policy</span></li>
                <li><span className="hover:text-emerald-600 cursor-pointer">Terms of Service</span></li>
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
            <p>© 2026 Sevo Logistics Solutions Pvt. Ltd. All rights reserved.</p>
            <p>Affordable and Trusted Mini Truck Booking in Hosur</p>
          </div>
        </div>
      </footer>

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
          onComplete={() => {
            setShowCustomerEntryModal(false)
            submitBooking()
          }}
        />
      )}
    </div>
  )
}

export default MiniTruckBookingHosurPage
