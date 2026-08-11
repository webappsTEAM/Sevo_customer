import React, { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import {
  MapPin, ChevronDown, ChevronUp, ArrowRight, ShieldCheck,
  Clock, Package, Boxes, X, Sparkles, Navigation, Truck,
  CheckCircle2, Star, Phone, HelpCircle, Loader2, LocateFixed,
  User, Mail, MessageSquare, AlertCircle
} from "lucide-react"
import { routes } from "../routes.js"
import { fetchServiceTiers, fetchLanes, fetchServiceAreas } from "../../api/logisticsService.js"
import { createBooking } from "../../api/bookingService.js"
import { apiRequestCustomerPhoneOTP, apiVerifyCustomerPhoneOTP } from "../../api/authService.js"
import { todayDateString } from "../../components/logistics/LogisticsKit.jsx"
import { SupportHelpCenterModal } from "../components/SupportHelpCenterModal.jsx"
import { useAuth } from "../../state/auth/useAuth.js"
import { CustomerAccountModal } from "./BookingPage.jsx"
import { CustomerEntryFlowModal } from "../components/CustomerEntryFlowModal.jsx"
import { getAddress } from "../../api/geocoding.js"

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
import { searchPlaces } from "../../services/locationService.js"

async function filterLocationSuggestions(searchText) {
  if (!searchText || !searchText.trim()) return []
  return searchPlaces(searchText)
}

/* ── Mini Truck Booking in Hosur Page ── */
export function MiniTruckBookingHosurPage() {
  const navigate = useNavigate()

  // Form State
  const [pickup, setPickup] = useState("")
  const [drop, setDrop] = useState("")
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [userType, setUserType] = useState("House Shifting & Personal Items")
  const [estimateModalOpen, setEstimateModalOpen] = useState(false)
  const [selectedRoute, setSelectedRoute] = useState(null)

  // Booking Flow State
  const [vehicleSelectorOpen, setVehicleSelectorOpen] = useState(false)
  const [selectedVehicle, setSelectedVehicle] = useState(null)
  const [loginModalOpen, setLoginModalOpen] = useState(false)
  const [bookingSuccessOpen, setBookingSuccessOpen] = useState(false)
  const [supportModalOpen, setSupportModalOpen] = useState(false)
  const [noServiceRoute, setNoServiceRoute] = useState(false)
  const [otpStep, setOtpStep] = useState(false) // false = info form, true = OTP entry
  const [otpValue, setOtpValue] = useState("")
  const [otpLoading, setOtpLoading] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [loginEmail, setLoginEmail] = useState("")
  const [loginWhatsapp, setLoginWhatsapp] = useState(true)
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

  // Truck tab selection
  const [activeTab, setActiveTab] = useState("light") // 'light' | 'heavy'
  const [activeVehicleDetails, setActiveVehicleDetails] = useState(null)

  // Lock body scroll when Know More modal is open
  useEffect(() => {
    document.body.style.overflow = activeVehicleDetails ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [activeVehicleDetails])

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

  useEffect(() => {
    let cancelled = false
    async function loadCatalog() {
      try {
        const [tiers, lanes, areas] = await Promise.all([
          fetchServiceTiers("mini_truck", LOGISTICS_CITY),
          fetchLanes("mini_truck", LOGISTICS_CITY),
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

  const pickupSuggestions = filterLocationSuggestions(pickup)
  const dropSuggestions = filterLocationSuggestions(drop)

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

  // Adapt backend ServiceTier rows to the { id, name, capacity, price,
  // diagram, details } shape the rest of this page already renders.
  function tierToVehicle(tier) {
    return {
      id: tier.slug,
      name: tier.name,
      capacity: tier.capacity_label,
      price: `₹${Number(tier.starting_price).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`,
      diagram: TRUCK_DIAGRAM_BY_SLUG[tier.slug] || <ThreeWheelerDiagram />,
      details: {
        name: tier.name,
        capacity: `${tier.capacity_label} capacity`,
        suitableFor: VEHICLE_SUITABILITY_MAP[tier.slug]?.suitableFor || [],
        bestFor: VEHICLE_SUITABILITY_MAP[tier.slug]?.bestFor || tier.description,
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

  // HOSUR SERVICE AREA — routes we operate
  const SERVED_AREAS = [
    "hosur", "sipcot", "bagalur", "mathigiri", "zuzuvadi", "avalapalli",
    "moranapalli", "mookandapalli", "denkanikottai", "rayakottai", "thally",
    "alasanatham", "dinnur", "kelamangalam", "kamaraj", "shanthi",
    "nethaji", "chennathur", "dharga", "poonapalli", "berigai",
    "attibele", "anekal", "chandapura", "bommasandra", "hebbagodi",
    "electronic city", "jigani", "sarjapur", "silk board", "koramangala",
    "bengaluru", "bangalore", "whitefield", "kempegowda",
    "krishnagiri", "dharmapuri", "salem", "vellore",
    "tiruvannamalai", "chennai", "coimbatore", "erode", "tirupur", "madurai"
  ]

  const isRouteServed = (pickupVal, dropVal) => {
    const combined = (pickupVal + " " + dropVal).toLowerCase()
    return SERVED_AREAS.some((area) => combined.includes(area))
  }

  const handleGetEstimate = (e) => {
    if (e) e.preventDefault()
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
  const submitBooking = async () => {
    setBookingError("")
    setBookingSubmitting(true)
    try {
      const today = todayDateString()
      const vehicle = selectedVehicle || LIGHT_VEHICLES[0]
      const fare = Number(String(vehicle.price).replace(/[^0-9.]/g, "")) || 0
      const payload = {
        customer_name: name || "Guest",
        phone,
        service_category: "goods_transport_truck",
        issue_title: `Truck booking — ${vehicle.name}`,
        description: userType,
        address: pickup || "Hosur",
        drop_address: drop,
        preferred_date: today,
        total_amount: fare,
        payment_method: "COD",
        cart_data: [{ tier: vehicle.name, price: vehicle.price, route: selectedRoute?.to || null }],
      }
      if (vehicle._tierId) payload.logistics_tier = vehicle._tierId
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

  const handleConfirmAndBook = () => {
    // Called from the old Instant Estimate modal "Confirm & Book"
    if (!isSignedIn) {
      setEstimateModalOpen(false)
      setLoginModalOpen(true)
    } else {
      setEstimateModalOpen(false)
      submitBooking()
    }
  }

  const handleBookNow = () => {
    // Called from vehicle selector modal "Book Now"
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
      setLocalIsSignedIn(true)
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

      {/* ── Hero Section (Page 1) ──────────────────────────────── */}
      <section
        className="relative pt-10 pb-8 sm:pt-14 sm:pb-12 border-b border-slate-100/60 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url('/hero_minitruck_bg.png')` }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-slate-950/55 to-slate-950/80"></div>
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 text-center z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-emerald-300 text-xs font-bold tracking-wide mb-4 shadow-sm border border-white/25 backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
            Hosur Mini Truck Service
          </div>

          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight max-w-3xl mx-auto drop-shadow-lg">
            Affordable and Trusted Mini Truck Booking in Hosur
          </h1>

          <p className="mt-4 text-sm sm:text-base text-slate-200 max-w-2xl mx-auto leading-relaxed drop-shadow">
            Whether you're relocating, transporting furniture, or delivering commercial goods, our mini truck booking service in Hosur offers reliable, safe, and cost-effective transportation
          </p>

          <div className="mt-5 flex items-center justify-center gap-3 text-xs font-semibold text-emerald-300">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> On-Demand in 15 mins
            </span>
            <span className="text-white/40">•</span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> Verified Drivers
            </span>
            <span className="text-white/40">•</span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4 text-emerald-400" /> Transparent Pricing
            </span>
          </div>
        </div>

        {/* ── Quick Estimate Bar (Page 1) ──────────────────────── */}
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
                className="text-xs sm:text-sm font-bold text-emerald-700 hover:text-emerald-800 border-b border-dotted border-emerald-600 hover:border-emerald-700 mt-5 cursor-pointer pb-0.5 inline-block focus:outline-none"
              >
                Know More
              </button>
            </div>
          ))}
        </div>
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

      {/* ── Vehicle Selector Modal (Image 4 flow) ─────────────────── */}
      {vehicleSelectorOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setVehicleSelectorOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-100 relative overflow-hidden flex flex-col sm:flex-row max-h-[90vh]"
          >
            <button
              onClick={() => setVehicleSelectorOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer z-10"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Left: Address Details */}
            <div className="sm:w-[45%] shrink-0 bg-slate-50 p-5 sm:p-6 border-b sm:border-b-0 sm:border-r border-slate-200 flex flex-col">
              <h3 className="text-base font-extrabold text-slate-900 mb-5">Address Details</h3>
              {/* Pickup */}
              <div className="flex items-start gap-3 mb-4">
                <div className="mt-1 w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-slate-800 truncate">{name || "Customer"} • {phone || "—"}</p>
                  <p className="text-xs text-slate-500 leading-snug mt-0.5">{pickup || "Hosur, Tamil Nadu"}</p>
                </div>
                <button
                  onClick={() => setVehicleSelectorOpen(false)}
                  className="ml-auto text-xs font-bold text-emerald-700 hover:underline cursor-pointer shrink-0"
                >Edit</button>
              </div>
              {/* Dashed line */}
              <div className="ml-[4px] w-[2px] h-5 bg-slate-300 border-l-2 border-dashed border-slate-400 mb-1" />
              {/* Drop */}
              <div className="flex items-start gap-3 mb-6">
                <div className="mt-1 w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-slate-800 truncate">{name || "Customer"} • {phone || "—"}</p>
                  <p className="text-xs text-slate-500 leading-snug mt-0.5">{drop || (selectedRoute ? selectedRoute.to : "Not specified")}</p>
                </div>
                <button
                  onClick={() => setVehicleSelectorOpen(false)}
                  className="ml-auto text-xs font-bold text-emerald-700 hover:underline cursor-pointer shrink-0"
                >Edit</button>
              </div>

              {/* Offer banner */}
              <div className="mt-auto bg-emerald-700 text-white rounded-2xl px-4 py-2.5 flex items-center gap-2 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5 text-yellow-300 shrink-0" />
                Get up to 30% off on your first order. *T&C apply
              </div>

              {/* Book Now button */}
              <button
                type="button"
                onClick={handleBookNow}
                disabled={bookingSubmitting}
                className="mt-3 w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed text-white font-extrabold text-sm shadow-lg shadow-emerald-600/30 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {bookingSubmitting ? (<><Loader2 className="w-4 h-4 animate-spin" /> Confirming...</>) : "Book Now"}
              </button>
              {isSignedIn && bookingError && (
                <p style={{ color: "var(--bad)", fontSize: 12, marginTop: 8, textAlign: "center" }}>{bookingError}</p>
              )}
            </div>

            {/* Right: Select Vehicle */}
            <div className="flex-1 flex flex-col p-5 sm:p-6 overflow-y-auto">
              <h3 className="text-base font-extrabold text-slate-900 mb-4">Select Vehicle</h3>
              <div className="space-y-2.5">
                {[...HEAVY_VEHICLES, ...LIGHT_VEHICLES].map((v, idx) => {
                  const isSelected = selectedVehicle?.id === v.id
                  // Fare calculation: base per-km rate depending on route distance
                  const routeDist = selectedRoute ? parseInt(selectedRoute.distance) : 40
                  const fareRaw = routeDist * (v.id === "1_7_ton" ? 42 : v.id === "pickup_8ft" ? 38 : v.id === "tata_ace" ? 35 : 28)
                  const fare = `₹ ${fareRaw.toLocaleString("en-IN")}`
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setSelectedVehicle(v)}
                      className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 transition-all cursor-pointer text-left ${
                        isSelected
                          ? "border-emerald-600 bg-emerald-50/60 shadow-md shadow-emerald-200"
                          : "border-slate-200 bg-white hover:border-emerald-300 hover:bg-slate-50"
                      }`}
                    >
                      <div className="w-16 shrink-0 flex items-center justify-center">
                        {React.cloneElement(v.diagram, { className: "w-full h-14" })}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-extrabold text-slate-900">{v.name}</p>
                        <p className="text-xs text-slate-500">{v.capacity}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-extrabold text-slate-800">{fare}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Login / Welcome Modal (Image 5 flow) ─────────────────── */}
      {loginModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => { setLoginModalOpen(false); setOtpStep(false); setOtpValue("") }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-transparent rounded-3xl max-w-[780px] w-full shadow-2xl relative overflow-hidden flex max-h-[92vh]"
          >
            <button
              onClick={() => { setLoginModalOpen(false); setOtpStep(false); setOtpValue("") }}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer z-10"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Left: Delivery Person Photo */}
            <div className="hidden sm:block sm:w-[40%] shrink-0 bg-gradient-to-br from-slate-700 to-slate-900 relative overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center">
                {/* Logistics professional illustration placeholder */}
                <div className="text-center px-6">
                  <div className="w-24 h-24 rounded-full bg-emerald-600/20 border-2 border-emerald-500/40 flex items-center justify-center mx-auto mb-4">
                    <Truck className="w-12 h-12 text-emerald-400" />
                  </div>
                  <p className="text-white font-extrabold text-lg leading-tight">CalServices</p>
                  <p className="text-emerald-400 text-xs font-semibold mt-1">Hosur Logistics</p>
                  <p className="text-slate-400 text-[11px] mt-3 leading-relaxed">Reliable & affordable mini truck booking in Hosur</p>
                </div>
              </div>
            </div>

            {/* Right: Form */}
            <div className="flex-1 bg-white p-6 sm:p-10 flex flex-col justify-center overflow-y-auto">
              <div className="mb-6">
                <h2 className="text-2xl font-extrabold text-slate-900">Welcome! 👋</h2>
                <p className="text-sm text-slate-500 mt-1">Sign in or make an account to complete your order with us.</p>
              </div>

              {!otpStep ? (
                <div className="space-y-3">
                  {/* Name */}
                  <div className="flex items-center gap-2.5 border border-slate-200 rounded-xl px-3.5 h-12 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500/20 transition-all bg-white">
                    <User className="w-4 h-4 text-slate-400 shrink-0" />
                    <input
                      type="text"
                      placeholder="Enter your Name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="flex-1 text-sm text-slate-800 placeholder-slate-400 bg-transparent outline-none"
                    />
                  </div>
                  {/* Phone */}
                  <div className="flex items-center gap-2.5 border border-slate-200 rounded-xl px-3.5 h-12 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500/20 transition-all bg-white">
                    <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                    <div className="text-sm font-semibold text-slate-600 border-r border-slate-200 pr-2.5 mr-1">+91</div>
                    <input
                      type="tel"
                      placeholder="Phone Number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      maxLength={10}
                      className="flex-1 text-sm text-slate-800 placeholder-slate-400 bg-transparent outline-none"
                    />
                  </div>
                  {/* Email */}
                  <div className="flex items-center gap-2.5 border border-slate-200 rounded-xl px-3.5 h-12 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500/20 transition-all bg-white">
                    <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                    <input
                      type="email"
                      placeholder="Enter your email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="flex-1 text-sm text-slate-800 placeholder-slate-400 bg-transparent outline-none"
                    />
                  </div>
                  {/* WhatsApp checkbox */}
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={loginWhatsapp}
                      onChange={(e) => setLoginWhatsapp(e.target.checked)}
                      className="w-4 h-4 accent-emerald-600"
                    />
                    <span className="text-xs text-slate-600 font-medium flex items-center gap-1">
                      <MessageSquare className="w-3.5 h-3.5 text-green-600" /> Receive updates via WhatsApp
                    </span>
                  </label>

                  <p className="text-[11px] text-slate-400 text-center leading-relaxed pt-1">
                    By proceeding, you agree to the{" "}
                    <span className="text-emerald-700 font-semibold cursor-pointer hover:underline">terms of services</span>{" "}and{" "}
                    <span className="text-emerald-700 font-semibold cursor-pointer hover:underline">privacy policy</span>
                  </p>

                  {bookingError && (
                    <p style={{ color: "var(--bad)", fontSize: 13, textAlign: "center" }}>{bookingError}</p>
                  )}

                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={otpLoading || !phone || phone.trim().length < 10}
                    className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-extrabold text-sm shadow-lg shadow-emerald-600/30 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    {otpLoading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Sending OTP...</>
                    ) : (
                      "Continue"
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-center mb-2">
                    <p className="text-sm font-bold text-slate-700">Enter OTP sent to</p>
                    <p className="text-base font-extrabold text-emerald-700">+91 {phone}</p>
                  </div>
                  {/* OTP Input */}
                  <div className="flex justify-center gap-2 sm:gap-3">
                    {[0,1,2,3,4,5].map((i) => (
                      <input
                        key={i}
                        type="text"
                        maxLength={1}
                        value={otpValue[i] || ""}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "")
                          const arr = otpValue.split("")
                          arr[i] = val
                          setOtpValue(arr.join(""))
                          if (val && e.target.nextSibling) e.target.nextSibling.focus()
                        }}
                        className="w-[45px] sm:w-[54px] h-[54px] sm:h-[64px] text-center text-2xl sm:text-3xl font-extrabold border-2 border-slate-200 focus:border-emerald-500 rounded-2xl outline-none transition-colors text-slate-900"
                      />
                    ))}
                  </div>
                  {bookingError && (
                    <p style={{ color: "var(--bad)", fontSize: 13, textAlign: "center" }}>{bookingError}</p>
                  )}

                  <button
                    type="button"
                    onClick={handleVerifyOtp}
                    disabled={otpLoading || bookingSubmitting || otpValue.replace(/\D/g,"").length < 6}
                    className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-extrabold text-sm shadow-lg shadow-emerald-600/30 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    {otpLoading || bookingSubmitting ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> {bookingSubmitting ? "Confirming booking..." : "Verifying..."}</>
                    ) : (
                      "Verify OTP & Book"
                    )}
                  </button>
                  <div className="flex items-center justify-between mt-2 px-1">
                    <button
                      type="button"
                      onClick={() => { setOtpStep(false); setOtpValue("") }}
                      className="text-xs text-slate-500 hover:text-emerald-700 font-semibold transition-colors cursor-pointer"
                    >
                      ← Change number
                    </button>
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={otpLoading}
                      className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {otpLoading ? "Resending..." : "Resend OTP"}
                    </button>
                  </div>
                </div>
              )}
            </div>
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
            <h2 className="text-xl font-extrabold text-slate-900 mb-2">Booking Confirmed!</h2>
            <p className="text-sm text-slate-600 leading-relaxed mb-1">
              Our service partner will contact you shortly.
            </p>
            {lastBookingId && (
              <p className="text-xs font-bold text-emerald-700 mb-1">Booking ID: {lastBookingId}</p>
            )}
            <p className="text-xs text-slate-400 mb-6">
              {pickup && drop ? `${pickup} → ${drop}` : "Your booking has been placed successfully."}
            </p>
            {selectedVehicle && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 mb-5 flex items-center gap-3">
                <div className="w-12 h-10 flex items-center justify-center shrink-0">
                  {React.cloneElement(selectedVehicle.diagram, { className: "w-12 h-10" })}
                </div>
                <div className="text-left">
                  <p className="text-xs font-extrabold text-slate-900">{selectedVehicle.name}</p>
                  <p className="text-[11px] text-slate-500">{selectedVehicle.capacity} • {selectedVehicle.price}/km</p>
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={() => setBookingSuccessOpen(false)}
              className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm transition-all cursor-pointer"
            >
              Done
            </button>
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
            <p>© 2026 CalServices Logistics Solutions Pvt. Ltd. All rights reserved.</p>
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
          onSuccess={() => setShowCustomerEntryModal(false)}
        />
      )}
    </div>
  )
}

export default MiniTruckBookingHosurPage
