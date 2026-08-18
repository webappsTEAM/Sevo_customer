import { useEffect, useState, useMemo, useCallback } from "react"
import { createPortal } from "react-dom"
import { useNavigate, useSearchParams, useLocation } from "react-router-dom"
import {
  Home, PaintRoller,
  SprayCan, Building2, AirVent, Hammer, Boxes,
  ShieldCheck, BadgeCheck, Clock, Award, Headphones,
  Star, Search, MapPin, ChevronDown, ChevronLeft, ChevronRight,
  Smartphone, Phone, Mail, X, ArrowRight,
  ClipboardList, CalendarDays, UserCheck, DoorOpen, Wallet, User, SlidersHorizontal, ShoppingCart,
  Sparkles, Apple, ShoppingBag, Carrot, HeartPulse, CheckCircle2, Plus, Minus, Check, Repeat2,
} from "lucide-react"
import { routes } from "../routes.js"
import { CustomerEntryFlowModal } from "../components/CustomerEntryFlowModal.jsx"
import { PackageModal, CustomCleaningPackageModal, KitchenCleaningModal, PaintingPackageModal, MasonPackageModal, BkStyles, CustomerAccountModal, AddAddressSearchModal } from "./BookingPage.jsx"
import { CATEGORIES as BOOKING_CATEGORIES } from "./categoriesData.js"
import { SofaCleaningModal } from "./SofaCleaningModal.jsx"
import { BathroomCleaningModal } from "./BathroomCleaningModal.jsx"
import { CockroachControlModal } from "./CockroachControlModal.jsx"
import { AntsBedBugsControlModal } from "./AntsBedBugsControlModal.jsx"
import { useAuth } from "../../state/auth/useAuth.js"
import { apiUpdateCustomerLastLocation } from "../../api/authService.js"
import { apiRequest } from "../../api/client.js"
import { getAddress } from "../../api/geocoding.js"
import { motion, AnimatePresence } from "framer-motion"
import { getHomePageConfig, fetchPublishedHomePageConfig } from "../../config/homePageConfig.js"

// lucide-react dropped brand/social icons — small inline marks instead of
// pulling in a whole extra icon package for four footer glyphs.
function FacebookMark(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12Z" />
    </svg>
  )
}
function InstagramMark(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}
function YoutubeMark(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M22.5 6.5s-.22-1.56-.9-2.25c-.86-.9-1.82-.9-2.26-.96C16.2 3 12 3 12 3h-.01s-4.2 0-7.34.29c-.44.06-1.4.06-2.26.96C1.72 4.94 1.5 6.5 1.5 6.5S1.2 8.35 1.2 10.2v1.6c0 1.85.3 3.7.3 3.7s.22 1.56.89 2.25c.86.9 1.98.87 2.48.97C6.6 18.9 12 19 12 19s4.2-.01 7.34-.3c.44-.05 1.4-.05 2.26-.96.68-.69.9-2.25.9-2.25s.3-1.85.3-3.7v-1.6c0-1.85-.3-3.7-.3-3.7ZM9.75 13.9V8.5l5.25 2.71-5.25 2.7Z" />
    </svg>
  )
}
function TwitterMark(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M18.9 3H22l-7.2 8.23L23 21h-6.6l-5.17-6.42L5.3 21H2.2l7.7-8.8L2 3h6.75l4.67 5.86L18.9 3Zm-1.16 16.2h1.72L7.35 4.7H5.5l12.24 14.5Z" />
    </svg>
  )
}

/* ── Custom High-Fidelity Transport Illustrations ── */
function TruckGraphic({ className = "w-16 h-16" }) {
  return (
    <svg viewBox="0 0 120 90" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Ground shadow */}
      <ellipse cx="58" cy="74" rx="44" ry="4.5" fill="#d1fae5" opacity="0.8" />
      {/* Yellow Cargo Container (clean closed solid box with 3D bevel) */}
      <rect x="18" y="24" width="48" height="38" rx="4" fill="#f59e0b" />
      <path d="M18 28C18 25.8 19.8 24 22 24H62C64.2 24 66 25.8 66 28V32H18V28Z" fill="#fbbf24" />
      {/* Cargo container vertical panel lines */}
      <line x1="34" y1="26" x2="34" y2="60" stroke="#d97706" strokeWidth="1.5" strokeDasharray="3 3" />
      <line x1="50" y1="26" x2="50" y2="60" stroke="#d97706" strokeWidth="1.5" strokeDasharray="3 3" />
      {/* Blue Driver Cabin */}
      <path d="M64 34H78C82 34 85 36.5 86.5 40.5L91 50C92 52.5 92 55 92 57.5V62H64V34Z" fill="#2563eb" />
      {/* Windshield */}
      <path d="M69 38H77C79 38 80.8 39.5 81.6 41.5L84.5 48.5H69V38Z" fill="#93c5fd" />
      <path d="M71 40L76 40L73.5 46L70 46Z" fill="#ffffff" opacity="0.7" />
      {/* Front Headlight */}
      <circle cx="89" cy="56" r="2.5" fill="#fef08a" />
      {/* Bumper */}
      <rect x="88" y="59" width="6" height="3.5" rx="1.5" fill="#64748b" />
      {/* Side door handle */}
      <rect x="70" y="52" width="4" height="1.5" rx="0.5" fill="#1e40af" />
      {/* Wheels */}
      <circle cx="32" cy="64" r="9.5" fill="#1e293b" />
      <circle cx="32" cy="64" r="5" fill="#94a3b8" />
      <circle cx="32" cy="64" r="2" fill="#ffffff" />
      <circle cx="76" cy="64" r="9.5" fill="#1e293b" />
      <circle cx="76" cy="64" r="5" fill="#94a3b8" />
      <circle cx="76" cy="64" r="2" fill="#ffffff" />
    </svg>
  )
}

function TwoWheelerGraphic({ className = "w-16 h-16" }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Ground shadow */}
      <ellipse cx="50" cy="80" rx="36" ry="4.5" fill="#d1fae5" opacity="0.8" />
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

function PackersMoversGraphic({ className = "w-16 h-16" }) {
  return (
    <svg viewBox="0 0 110 90" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Ground shadow */}
      <ellipse cx="55" cy="74" rx="46" ry="4.5" fill="#d1fae5" opacity="0.8" />
      {/* Standing Floor Lamp on Left */}
      <path d="M26 22L34 34H18L26 22Z" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1" />
      <line x1="26" y1="34" x2="26" y2="70" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
      <ellipse cx="26" cy="70" rx="6" ry="2" fill="#64748b" />
      {/* Light glow */}
      <path d="M20 34L12 56H34L28 34Z" fill="#fef08a" opacity="0.25" />
      {/* Cardboard Box / Nightstand */}
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

function ElectricianGraphic({ className = "w-16 h-16" }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="50" cy="80" rx="36" ry="4.5" fill="#d1fae5" opacity="0.8" />
      <rect x="25" y="20" width="50" height="52" rx="6" fill="#1e293b" />
      <rect x="28" y="23" width="44" height="46" rx="4" fill="#334155" />
      <rect x="33" y="28" width="10" height="18" rx="2" fill="#e2e8f0" />
      <rect x="36" y="30" width="4" height="8" rx="1" fill="#ef4444" />
      <rect x="45" y="28" width="10" height="18" rx="2" fill="#e2e8f0" />
      <rect x="48" y="34" width="4" height="8" rx="1" fill="#10b981" />
      <rect x="57" y="28" width="10" height="18" rx="2" fill="#e2e8f0" />
      <rect x="60" y="30" width="4" height="8" rx="1" fill="#ef4444" />
      <path d="M38 46V62C38 65 42 67 46 67H60" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" />
      <path d="M50 46V58C50 62 54 64 58 64H65" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
      <path d="M62 46V54C62 58 65 60 70 60" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" />
      <circle cx="72" cy="28" r="11" fill="#f59e0b" />
      <path d="M73 20L67 29H72L71 36L77 27H72L73 20Z" fill="#ffffff" />
    </svg>
  )
}

function FullHouseCleaningGraphic({ className = "w-12 h-12" }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="houseRoof" x1="0" y1="0" x2="100" y2="100">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
        <linearGradient id="houseWall" x1="0" y1="0" x2="0" y2="100">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
      </defs>
      <ellipse cx="50" cy="84" rx="42" ry="5.5" fill="#cbd5e1" opacity="0.7" />
      <rect x="20" y="40" width="60" height="38" rx="6" fill="url(#houseWall)" />
      <path d="M14 40L50 12L86 40H14Z" fill="url(#houseRoof)" />
      <rect x="68" y="18" width="8" height="15" rx="1" fill="#d97706" />
      <path d="M66 18H78" stroke="#b45309" strokeWidth="1.5" />
      <rect x="42" y="52" width="16" height="26" rx="2" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1" />
      <circle cx="46" cy="65" r="1.75" fill="#f59e0b" />
      <rect x="28" y="48" width="10" height="10" rx="1.5" fill="#93c5fd" />
      <line x1="33" y1="48" x2="33" y2="58" stroke="#1d4ed8" strokeWidth="1" />
      <line x1="28" y1="53" x2="38" y2="53" stroke="#1d4ed8" strokeWidth="1" />
      <rect x="62" y="48" width="10" height="10" rx="1.5" fill="#93c5fd" />
      <line x1="67" y1="48" x2="67" y2="58" stroke="#1d4ed8" strokeWidth="1" />
      <line x1="62" y1="53" x2="72" y2="53" stroke="#1d4ed8" strokeWidth="1" />
      <path d="M12 24L14 27L17 24L14 21L12 24Z" fill="#fbbf24" />
      <path d="M84 20L85.5 22.5L88 20L85.5 17.5L84 20Z" fill="#fbbf24" />
    </svg>
  )
}

function PlumberGraphic({ className = "w-16 h-16" }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="50" cy="80" rx="36" ry="4.5" fill="#d1fae5" opacity="0.8" />
      <path d="M22 36H55C62 36 67 41 67 48V72" stroke="#94a3b8" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M22 36H55C62 36 67 41 67 48V72" stroke="#cbd5e1" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="42" y="28" width="10" height="16" rx="2" fill="#d97706" />
      <circle cx="47" cy="22" r="8" fill="#f59e0b" />
      <circle cx="47" cy="22" r="4" fill="#b45309" />
      <rect x="62" y="58" width="10" height="6" rx="1" fill="#64748b" />
      <path d="M67 74C67 74 72 80 72 83C72 85.8 69.8 88 67 88C64.2 88 62 85.8 62 83C62 80 67 74 67 74Z" fill="#3b82f6" />
      <path d="M52 64C52 64 55 68 55 70C55 71.7 53.7 73 52 73C50.3 73 49 71.7 49 70C49 68 52 64 52 64Z" fill="#60a5fa" />
    </svg>
  )
}

function KitchenCleaningGraphic({ className = "w-12 h-12" }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="50" cy="84" rx="42" ry="5.5" fill="#cbd5e1" opacity="0.7" />
      <rect x="22" y="56" width="56" height="20" rx="3" fill="#334155" />
      <rect x="20" y="52" width="60" height="4" rx="1.5" fill="#475569" />
      <path d="M36 52C36 46 40 44 40 52" stroke="#60a5fa" strokeWidth="3" strokeLinecap="round" />
      <rect x="28" y="34" width="24" height="18" rx="2" fill="#ef4444" />
      <rect x="26" y="32" width="28" height="3" rx="1" fill="#475569" />
      <rect x="36" y="28" width="8" height="4" rx="1" fill="#475569" />
      <path d="M28 40H24V44H28" fill="#475569" />
      <path d="M52 40H56V44H52" fill="#475569" />
      <rect x="58" y="38" width="10" height="14" rx="1.5" fill="#2563eb" />
      <path d="M63 38V32L59 35" stroke="#1d4ed8" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M72 26L74 29L77 26L74 23L72 26Z" fill="#fbbf24" />
    </svg>
  )
}

function CarpentryGraphic({ className = "w-16 h-16" }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="50" cy="80" rx="36" ry="4.5" fill="#d1fae5" opacity="0.8" />
      <rect x="18" y="56" width="64" height="16" rx="4" fill="#d97706" />
      <rect x="18" y="56" width="64" height="4" rx="2" fill="#f59e0b" />
      <line x1="26" y1="64" x2="52" y2="64" stroke="#b45309" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="58" y1="64" x2="74" y2="64" stroke="#b45309" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M22 28L42 50H26L22 28Z" fill="#94a3b8" />
      <path d="M20 22C18 22 16 24 16 26V32C16 34 18 36 20 36H24L22 22H20Z" fill="#ef4444" />
      <path d="M55 42L76 21L82 27L61 48L55 42Z" fill="#d97706" />
      <rect x="54" y="38" width="16" height="10" rx="2" fill="#475569" transform="rotate(-45 54 38)" />
    </svg>
  )
}

function BedroomCleaningGraphic({ className = "w-12 h-12" }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="50" cy="84" rx="42" ry="5.5" fill="#cbd5e1" opacity="0.7" />
      <rect x="18" y="24" width="64" height="44" rx="4" fill="#d97706" />
      <rect x="20" y="26" width="60" height="12" rx="2" fill="#b45309" />
      <rect x="24" y="44" width="52" height="24" rx="2.5" fill="#e2e8f0" />
      <rect x="22" y="52" width="56" height="16" rx="2" fill="#2563eb" />
      <path d="M46 44H74V68H46V44Z" fill="#fbbf24" />
      <rect x="28" y="35" width="18" height="10" rx="2" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" />
      <rect x="54" y="35" width="18" height="10" rx="2" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" />
      <line x1="26" y1="68" x2="26" y2="76" stroke="#b45309" strokeWidth="4" strokeLinecap="round" />
      <line x1="74" y1="68" x2="74" y2="76" stroke="#b45309" strokeWidth="4" strokeLinecap="round" />
    </svg>
  )
}

function AcGraphic({ className = "w-16 h-16" }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="50" cy="80" rx="36" ry="4.5" fill="#d1fae5" opacity="0.8" />
      <rect x="18" y="24" width="64" height="28" rx="5" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" />
      <rect x="22" y="28" width="56" height="4" rx="2" fill="#94a3b8" />
      <circle cx="74" cy="42" r="2.5" fill="#10b981" />
      <rect x="24" y="44" width="16" height="2" fill="#cbd5e1" />
      <rect x="22" y="46" width="56" height="3" fill="#e2e8f0" />
      <path d="M30 56C30 56 35 64 35 70" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" opacity="0.9" />
      <path d="M50 56C50 56 55 65 55 72" stroke="#0284c7" strokeWidth="2.5" strokeLinecap="round" opacity="0.9" />
      <path d="M70 56C70 56 75 64 75 70" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" opacity="0.9" />
      <circle cx="80" cy="24" r="8" fill="#38bdf8" />
      <path d="M80 19V29M75 24H85M76.5 20.5L83.5 27.5M83.5 20.5L76.5 27.5" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function SofaCleaningGraphic({ className = "w-12 h-12" }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="sofaBody" x1="0" y1="0" x2="0" y2="100">
          <stop offset="0%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#1e40af" />
        </linearGradient>
        <linearGradient id="sofaCush" x1="0" y1="0" x2="0" y2="100">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#2563eb" />
        </linearGradient>
      </defs>
      <ellipse cx="50" cy="84" rx="42" ry="5.5" fill="#cbd5e1" opacity="0.7" />
      <rect x="18" y="38" width="64" height="28" rx="6" fill="url(#sofaBody)" />
      <rect x="16" y="50" width="68" height="18" rx="4" fill="url(#sofaCush)" />
      <rect x="14" y="44" width="11" height="22" rx="3" fill="#3b82f6" />
      <rect x="75" y="44" width="11" height="22" rx="3" fill="#1d4ed8" />
      <line x1="20" y1="68" x2="17" y2="76" stroke="#d97706" strokeWidth="3" strokeLinecap="round" />
      <line x1="80" y1="68" x2="83" y2="76" stroke="#d97706" strokeWidth="3" strokeLinecap="round" />
      <path d="M52 24C52 24 64 34 50 44" stroke="#f59e0b" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M45 40L49 50L39 45L45 40Z" fill="#fbbf24" />
      <path d="M28 26L30 29L33 26L30 23L28 26Z" fill="#fbbf24" />
      <path d="M72 26L73.5 28.5L75.5 26L73.5 23.5L72 26Z" fill="#fbbf24" />
    </svg>
  )
}

function FridgeGraphic({ className = "w-16 h-16" }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="50" cy="80" rx="36" ry="4.5" fill="#d1fae5" opacity="0.8" />
      <rect x="28" y="16" width="44" height="58" rx="6" fill="#3b82f6" />
      <rect x="30" y="18" width="40" height="22" rx="4" fill="#60a5fa" />
      <rect x="30" y="43" width="40" height="29" rx="4" fill="#2563eb" />
      <rect x="34" y="32" width="3" height="6" rx="1.5" fill="#ffffff" />
      <rect x="34" y="47" width="3" height="12" rx="1.5" fill="#ffffff" />
      <rect x="52" y="48" width="12" height="12" rx="2" fill="#1e40af" />
      <rect x="56" y="50" width="4" height="4" rx="1" fill="#93c5fd" />
    </svg>
  )
}

function BathroomCleaningGraphic({ className = "w-12 h-12" }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="50" cy="84" rx="42" ry="5.5" fill="#cbd5e1" opacity="0.7" />
      <circle cx="34" cy="30" r="14" fill="#93c5fd" stroke="#cbd5e1" strokeWidth="1.5" />
      <path d="M26 24L38 36" stroke="#ffffff" strokeWidth="2" opacity="0.6" strokeLinecap="round" />
      <rect x="20" y="50" width="28" height="24" rx="2" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1" />
      <rect x="18" y="46" width="32" height="4" rx="1" fill="#cbd5e1" />
      <path d="M34 46V40H38" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M56 42H78V54C78 60 72 66 65 66C58 66 56 60 56 54V42Z" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1" />
      <rect x="58" y="26" width="16" height="16" rx="2" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1" />
      <circle cx="70" cy="30" r="1.5" fill="#94a3b8" />
      <ellipse cx="67" cy="42" rx="10" ry="3.5" fill="#2563eb" />
      <path d="M60 66L62 76H72L74 66H60Z" fill="#cbd5e1" />
      <circle cx="16" cy="42" r="3" fill="#e0f2fe" opacity="0.8" />
      <circle cx="48" cy="42" r="2" fill="#e0f2fe" opacity="0.8" />
      <circle cx="82" cy="34" r="3.5" fill="#e0f2fe" opacity="0.8" />
    </svg>
  )
}

function WashingMachineGraphic({ className = "w-16 h-16" }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="50" cy="80" rx="36" ry="4.5" fill="#d1fae5" opacity="0.8" />
      <rect x="25" y="18" width="50" height="56" rx="6" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" />
      <rect x="28" y="22" width="44" height="10" rx="2" fill="#e2e8f0" />
      <circle cx="34" cy="27" r="3" fill="#64748b" />
      <circle cx="42" cy="27" r="1.5" fill="#10b981" />
      <circle cx="47" cy="27" r="1.5" fill="#3b82f6" />
      <rect x="56" y="25" width="12" height="4" rx="1" fill="#334155" />
      <circle cx="50" cy="50" r="17" fill="#475569" />
      <circle cx="50" cy="50" r="13" fill="#38bdf8" />
      <circle cx="50" cy="50" r="9" fill="#0284c7" />
      <path d="M44 48C46 44 54 44 56 50C54 54 46 54 44 48Z" fill="#ffffff" opacity="0.6" />
    </svg>
  )
}

function WeeklyCleaningGraphic({ className = "w-12 h-12" }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="50" cy="84" rx="42" ry="5.5" fill="#cbd5e1" opacity="0.7" />
      <rect x="22" y="16" width="56" height="56" rx="6" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.5" />
      <rect x="22" y="16" width="56" height="14" rx="3" fill="#2563eb" />
      <circle cx="32" cy="16" r="2" fill="#475569" />
      <circle cx="42" cy="16" r="2" fill="#475569" />
      <circle cx="52" cy="16" r="2" fill="#475569" />
      <circle cx="68" cy="16" r="2" fill="#475569" />
      <line x1="38" y1="38" x2="68" y2="38" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />
      <line x1="38" y1="48" x2="68" y2="48" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />
      <line x1="38" y1="58" x2="68" y2="58" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />
      <path d="M29 38L32 41L36 35" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M29 48L32 51L36 45" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M29 58L32 61L36 55" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="70" cy="56" r="10" fill="#fbbf24" stroke="#d97706" strokeWidth="1" />
      <path d="M70 51V56H74" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function TvGraphic({ className = "w-16 h-16" }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="50" cy="80" rx="36" ry="4.5" fill="#d1fae5" opacity="0.8" />
      <rect x="15" y="20" width="70" height="46" rx="4" fill="#1e293b" />
      <rect x="18" y="23" width="64" height="40" rx="2" fill="#0f172a" />
      <path d="M18 45L36 32L54 44L72 28L82 35V63H18V45Z" fill="#3b82f6" opacity="0.8" />
      <path d="M18 50L32 40L48 52L64 38L82 48V63H18V50Z" fill="#60a5fa" opacity="0.9" />
      <circle cx="70" cy="30" r="5" fill="#fef08a" opacity="0.9" />
      <path d="M40 66L36 76H64L60 66H40Z" fill="#475569" />
      <rect x="30" y="76" width="40" height="4" rx="2" fill="#334155" />
      <circle cx="50" cy="64.5" r="1.5" fill="#10b981" />
    </svg>
  )
}

function CockroachControlGraphic({ className = "w-12 h-12" }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="50" cy="84" rx="42" ry="5.5" fill="#cbd5e1" opacity="0.7" />
      <defs>
        <linearGradient id="cockroachBody" x1="0" y1="0" x2="0" y2="100">
          <stop offset="0%" stopColor="#a16207" />
          <stop offset="100%" stopColor="#451a03" />
        </linearGradient>
      </defs>
      <g transform="translate(0, -4)">
        <path d="M47 28C43 20 38 18 32 18" stroke="#451a03" strokeWidth="2" strokeLinecap="round" />
        <path d="M53 28C57 20 62 18 68 18" stroke="#451a03" strokeWidth="2" strokeLinecap="round" />
        <path d="M40 40L28 35M40 48L25 48M40 56L28 62" stroke="#451a03" strokeWidth="2" strokeLinecap="round" />
        <path d="M60 40L72 35M60 48L75 48M60 56L72 62" stroke="#451a03" strokeWidth="2" strokeLinecap="round" />
        <circle cx="50" cy="30" r="5" fill="#451a03" />
        <ellipse cx="50" cy="48" rx="10" ry="16" fill="url(#cockroachBody)" stroke="#451a03" strokeWidth="1" />
        <line x1="50" y1="38" x2="50" y2="64" stroke="#451a03" strokeWidth="1.5" />
      </g>
      <circle cx="50" cy="44" r="26" stroke="#ef4444" strokeWidth="6.5" />
      <line x1="32" y1="26" x2="68" y2="62" stroke="#ef4444" strokeWidth="6.5" />
    </svg>
  )
}

function MicrowaveGraphic({ className = "w-16 h-16" }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="50" cy="80" rx="36" ry="4.5" fill="#d1fae5" opacity="0.8" />
      <rect x="18" y="24" width="64" height="48" rx="6" fill="#334155" />
      <rect x="21" y="27" width="40" height="42" rx="4" fill="#1e293b" />
      <rect x="24" y="30" width="34" height="36" rx="3" fill="#475569" />
      <rect x="26" y="32" width="30" height="32" rx="2" fill="#0f172a" opacity="0.8" />
      <circle cx="41" cy="48" r="8" fill="#f59e0b" opacity="0.4" />
      <rect x="55" y="34" width="3" height="28" rx="1.5" fill="#cbd5e1" />
      <rect x="63" y="27" width="16" height="42" rx="3" fill="#1e293b" />
      <rect x="65" y="30" width="12" height="7" rx="1.5" fill="#0284c7" />
      <text x="71" y="35.5" fontSize="4.5" fontWeight="bold" fill="#ffffff" textAnchor="middle" fontFamily="monospace">1:30</text>
      <circle cx="68" cy="42" r="2" fill="#94a3b8" />
      <circle cx="74" cy="42" r="2" fill="#94a3b8" />
      <circle cx="68" cy="48" r="2" fill="#94a3b8" />
      <circle cx="74" cy="48" r="2" fill="#94a3b8" />
      <rect x="66" y="54" width="10" height="10" rx="2" fill="#10b981" />
    </svg>
  )
}

function TermiteControlGraphic({ className = "w-12 h-12" }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="50" cy="84" rx="42" ry="5.5" fill="#cbd5e1" opacity="0.7" />
      {/* Circular border brush effect (clean vector circular line) */}
      <circle cx="50" cy="46" r="32" stroke="#475569" strokeWidth="2.5" strokeDasharray="6 3 2 3" opacity="0.8" />

      {/* Termite Bug matching 1st image */}
      <g transform="translate(0, 2)">
        {/* Antennae */}
        <path d="M42 22C38 18 31 16 26 18" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeDasharray="1.5 1.5" />
        <path d="M58 22C62 18 69 16 74 18" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeDasharray="1.5 1.5" />
        {/* Mandibles / Pincers */}
        <path d="M45 23C42 26 42 32 46 32" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" />
        <path d="M55 23C58 26 58 32 54 32" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" />
        {/* Legs */}
        <path d="M40 44L28 42M40 52L26 54M42 62L28 68" stroke="#d97706" strokeWidth="2" strokeLinecap="round" />
        <path d="M60 44L72 42M60 52L74 54M58 62L72 68" stroke="#d97706" strokeWidth="2" strokeLinecap="round" />
        {/* Head (Big, reddish-orange) */}
        <ellipse cx="50" cy="34" rx="11" ry="9" fill="#ea580c" stroke="#9a3412" strokeWidth="1" />
        {/* Thorax */}
        <ellipse cx="50" cy="45" rx="7" ry="5" fill="#eab308" />
        {/* Abdomen (Creamy segmented body) */}
        <ellipse cx="50" cy="60" rx="10" ry="14" fill="#fef08a" stroke="#eab308" strokeWidth="1" />
        {/* Segmentation lines */}
        <path d="M42 52H58" stroke="#eab308" strokeWidth="1" />
        <path d="M40 57H60" stroke="#eab308" strokeWidth="1" />
        <path d="M41 62H59" stroke="#eab308" strokeWidth="1" />
        <path d="M43 67H57" stroke="#eab308" strokeWidth="1" />
      </g>
    </svg>
  )
}

function AntBedBugControlGraphic({ className = "w-12 h-12" }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="50" cy="84" rx="42" ry="5.5" fill="#cbd5e1" opacity="0.7" />

      {/* Ant Trail on the left (tiny black ants crawling diagonally) */}
      <g stroke="#1e293b" strokeWidth="1" fill="#1e293b">
        {/* Ant 1 */}
        <g transform="translate(18, 22) scale(0.6)">
          <circle cx="10" cy="10" r="1.5" />
          <circle cx="13" cy="10" r="1" />
          <circle cx="16" cy="10" r="2" />
          <path d="M10 10L7 8M10 10L7 12M13 10L13 7M13 10L13 13M16 10L19 8M16 10L19 12" stroke="#1e293b" strokeWidth="0.75" />
        </g>
        {/* Ant 2 */}
        <g transform="translate(12, 36) scale(0.6)">
          <circle cx="10" cy="10" r="1.5" />
          <circle cx="13" cy="10" r="1" />
          <circle cx="16" cy="10" r="2" />
          <path d="M10 10L7 8M10 10L7 12M13 10L13 7M13 10L13 13M16 10L19 8M16 10L19 12" stroke="#1e293b" strokeWidth="0.75" />
        </g>
        {/* Ant 3 */}
        <g transform="translate(16, 52) scale(0.6)">
          <circle cx="10" cy="10" r="1.5" />
          <circle cx="13" cy="10" r="1" />
          <circle cx="16" cy="10" r="2" />
          <path d="M10 10L7 8M10 10L7 12M13 10L13 7M13 10L13 13M16 10L19 8M16 10L19 12" stroke="#1e293b" strokeWidth="0.75" />
        </g>
        {/* Ant 4 */}
        <g transform="translate(24, 66) scale(0.6)">
          <circle cx="10" cy="10" r="1.5" />
          <circle cx="13" cy="10" r="1" />
          <circle cx="16" cy="10" r="2" />
          <path d="M10 10L7 8M10 10L7 12M13 10L13 7M13 10L13 13M16 10L19 8M16 10L19 12" stroke="#1e293b" strokeWidth="0.75" />
        </g>
      </g>

      {/* Bedbug on the right (Brownish-red segmented oval body) */}
      <g transform="translate(12, 0)">
        {/* Antennae */}
        <path d="M52 30C54 26 58 24 62 24" stroke="#7f1d1d" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M58 30C60 26 64 24 68 24" stroke="#7f1d1d" strokeWidth="1.5" strokeLinecap="round" />
        {/* Legs */}
        <path d="M46 44L36 40M46 50L34 50M48 56L36 60" stroke="#7f1d1d" strokeWidth="2.0" strokeLinecap="round" />
        <path d="M64 44L74 40M64 50L76 50M62 56L74 60" stroke="#7f1d1d" strokeWidth="2.0" strokeLinecap="round" />
        {/* Head */}
        <polygon points="51,33 59,33 55,27" fill="#7f1d1d" />
        {/* Thorax */}
        <path d="M46 34H64L60 41H50L46 34Z" fill="#7f1d1d" />
        {/* Abdomen */}
        <circle cx="55" cy="51" r="11" fill="#a16207" stroke="#7f1d1d" strokeWidth="1.25" />
        {/* Abdomen Segments */}
        <path d="M46 47H64" stroke="#7f1d1d" strokeWidth="1.25" />
        <path d="M45 52H65" stroke="#7f1d1d" strokeWidth="1.25" />
        <path d="M47 57H63" stroke="#7f1d1d" strokeWidth="1.25" />
      </g>
    </svg>
  )
}

function ForYouGraphic({ className = "w-16 h-16" }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="50" cy="80" rx="36" ry="4.5" fill="#d1fae5" opacity="0.8" />
      <rect x="22" y="20" width="56" height="54" rx="14" fill="#ecfdf5" stroke="#a7f3d0" strokeWidth="2" />
      <circle cx="50" cy="46" r="18" fill="#059669" />
      <path d="M50 36L53.5 43.5L61.5 44.5L55.5 50L57 58L50 54L43 58L44.5 50L38.5 44.5L46.5 43.5L50 36Z" fill="#fef08a" />
      <circle cx="70" cy="24" r="6" fill="#f59e0b" />
      <path d="M70 20V28M66 24H74" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="28" cy="30" r="4" fill="#3b82f6" opacity="0.8" />
      <path d="M28 27V33M25 30H31" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" />
    </svg>
  )
}

function FoodHealthGraphic({ className = "w-16 h-16" }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="50" cy="80" rx="36" ry="4.5" fill="#d1fae5" opacity="0.8" />
      <ellipse cx="50" cy="52" rx="30" ry="12" fill="#10b981" />
      <path d="M20 52C20 68 32 74 50 74C68 74 80 68 80 52H20Z" fill="#059669" />
      <ellipse cx="50" cy="52" rx="27" ry="9" fill="#34d399" />
      <circle cx="40" cy="40" r="11" fill="#ef4444" />
      <path d="M40 29C40 25 43 23 44 21" stroke="#78350f" strokeWidth="2" strokeLinecap="round" />
      <ellipse cx="46" cy="25" rx="3.5" ry="2" fill="#22c55e" transform="rotate(-30 46 25)" />
      <path d="M52 46L68 28C69 27 71 27 72 29C73 30 73 32 71 34L57 50Z" fill="#ea580c" />
      <path d="M70 28L78 20M71 30L81 25M68 27L74 18" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" />
      <rect x="56" y="32" width="12" height="20" rx="3" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.5" />
      <rect x="59" y="28" width="6" height="4" rx="1" fill="#3b82f6" />
      <circle cx="74" cy="62" r="9" fill="#ffffff" stroke="#ef4444" strokeWidth="2" />
      <path d="M74 57V67M69 62H79" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

function GroceriesGraphic({ className = "w-16 h-16" }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="50" cy="82" rx="38" ry="5" fill="#d1fae5" opacity="0.8" />
      <path d="M26 34L22 74H78L74 34H26Z" fill="#d97706" />
      <path d="M26 34L30 30L34 34L38 30L42 34L46 30L50 34L54 30L58 34L62 30L66 34L70 30L74 34H26Z" fill="#b45309" />
      <rect x="28" y="14" width="10" height="26" rx="5" fill="#f59e0b" transform="rotate(-15 28 14)" />
      <line x1="28" y1="20" x2="34" y2="22" stroke="#b45309" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="26" y1="26" x2="32" y2="28" stroke="#b45309" strokeWidth="1.5" strokeLinecap="round" />
      <rect x="42" y="18" width="16" height="24" rx="2" fill="#3b82f6" />
      <polygon points="42,18 50,12 58,18" fill="#60a5fa" />
      <rect x="46" y="24" width="8" height="10" rx="1" fill="#ffffff" />
      <text x="50" y="31" fontSize="4.5" fontWeight="bold" fill="#3b82f6" textAnchor="middle">MILK</text>
      <rect x="62" y="20" width="12" height="20" rx="3" fill="#10b981" />
      <rect x="65" y="15" width="6" height="5" rx="1" fill="#d97706" />
      <circle cx="50" cy="54" r="11" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1.5" />
      <path d="M46 54L49 57L55 51" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function VegetablesGraphic({ className = "w-16 h-16" }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="50" cy="82" rx="38" ry="5" fill="#d1fae5" opacity="0.8" />
      <circle cx="34" cy="38" r="8" fill="#15803d" />
      <circle cx="28" cy="44" r="8" fill="#16a34a" />
      <circle cx="40" cy="44" r="8" fill="#22c55e" />
      <circle cx="34" cy="46" r="8" fill="#15803d" />
      <path d="M30 52C30 52 32 66 34 68C36 70 38 66 38 52H30Z" fill="#86efac" stroke="#16a34a" strokeWidth="1" />
      <circle cx="52" cy="56" r="14" fill="#dc2626" />
      <ellipse cx="48" cy="52" rx="3" ry="5" fill="#f87171" opacity="0.6" transform="rotate(-30 48 52)" />
      <path d="M52 42V38" stroke="#15803d" strokeWidth="2" strokeLinecap="round" />
      <path d="M48 42L52 44L56 42L54 40L50 40L48 42Z" fill="#16a34a" />
      <path d="M62 68L78 36C80 33 84 34 85 36C86 38 85 41 82 43L68 72C66 74 62 72 62 68Z" fill="#ea580c" />
      <line x1="68" y1="58" x2="74" y2="55" stroke="#c2410c" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="72" y1="48" x2="78" y2="45" stroke="#c2410c" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M80 34L90 20M82 36L92 26M78 32L86 18" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" />
      <ellipse cx="64" cy="62" rx="7" ry="10" fill="#7e22ce" transform="rotate(-20 64 62)" />
      <path d="M67 52C67 48 70 46 72 45" stroke="#15803d" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

// ── High-Fidelity Studio Product Photography Mapping ───────────────────
function getFoodItemPhoto(name = "", isGrocery = false) {
  const n = name.toLowerCase()

  if (isGrocery) {
    if (n.includes("combo") || n.includes("dals & grains")) {
      return "/mockups/groceries_realistic.png"
    }
    if (n.includes("staples") || n.includes("kitchen staples")) {
      return "/mockups/category_food_health.png"
    }
    if (n.includes("atta") || n.includes("wheat") || n.includes("flour")) {
      return "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&auto=format&fit=crop&q=80"
    }
    if (n.includes("rice") || n.includes("basmati")) {
      return "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&auto=format&fit=crop&q=80"
    }
    if (n.includes("dal") || n.includes("pulses") || n.includes("moong") || n.includes("toor")) {
      return "https://images.unsplash.com/photo-1585996746973-45f8fdf1ca23?w=400&auto=format&fit=crop&q=80"
    }
    if (n.includes("oil") || n.includes("ghee")) {
      return "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&auto=format&fit=crop&q=80"
    }
    if (n.includes("milk") || n.includes("dairy")) {
      return "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&auto=format&fit=crop&q=80"
    }
    if (n.includes("butter")) {
      return "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=400&auto=format&fit=crop&q=80"
    }
    if (n.includes("bread")) {
      return "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&auto=format&fit=crop&q=80"
    }
    if (n.includes("egg")) {
      return "https://images.unsplash.com/photo-1516467508483-a7212febe31a?w=400&auto=format&fit=crop&q=80"
    }
  }

  // 100% Accurate Verified Photographic Matches for Tamil & English Vegetable Names
  if (n.includes("basket") || n.includes("essential")) return "/mockups/vegetables_realistic.png"
  if (n.includes("exotic") || n.includes("gourds pack")) return "/mockups/category_food_health.png"
  if (n.includes("leafy & salad") || n.includes("leafy box") || n.includes("leafy & salad box")) return "/mockups/veg_coriander.png"
  
  if (n.includes("coriander") || n.includes("kothamalli") || n.includes("dhaniya")) return "/mockups/veg_coriander.png"
  if (n.includes("curry") || n.includes("karuveppilai") || n.includes("kadi patta")) return "/mockups/veg/curry_leaves.jpg"
  if (n.includes("lemon") || n.includes("elumichai") || n.includes("nimbu")) return "/mockups/veg_lemon.png"
  if (n.includes("ginger") || n.includes("inji") || n.includes("adrak")) return "/mockups/veg_ginger.png"
  if (n.includes("mushroom") || n.includes("kaalan")) return "/mockups/veg_mushroom.png"
  if (n.includes("bottle gourd") || n.includes("suraikkai") || n.includes("lauki")) return "/mockups/veg_lauki.png"
  if (n.includes("french beans") || n.includes("beans")) return "/mockups/veg_french_beans.png"
  if (n.includes("tomato") || n.includes("thakkali") || n.includes("tamatar") || n.includes("cherry")) return "/mockups/veg_tomato.png"
  if (n.includes("lady finger") || n.includes("vendakkai") || n.includes("bhindi") || n.includes("okra")) return "/mockups/veg_bhindi.png"
  if (n.includes("brinjal") || n.includes("kathirikai") || n.includes("baingan")) return "/mockups/veg_brinjal.png"
  if (n.includes("bitter gourd") || n.includes("pavakkai") || n.includes("karela")) return "/mockups/veg/karela.jpg"
  if (n.includes("drumstick") || n.includes("murungakkai") || n.includes("sahjan")) return "/mockups/veg/drumstick.jpg"
  if (n.includes("peas") || n.includes("pattani") || n.includes("matar")) return "/mockups/veg/peas.jpg"
  
  if (n.includes("peeled garlic") || n.includes("uricha poondu")) return "/mockups/veg/peeled_garlic.jpg"
  if (n.includes("garlic") || n.includes("poondu") || n.includes("lehsun")) return "/mockups/veg/garlic.jpg"
  if (n.includes("sweet potato") || n.includes("sakkaraivalli") || n.includes("shakarkand")) return "/mockups/veg/sweet_potato.jpg"
  if (n.includes("potato") || n.includes("urulaikilangu") || n.includes("aloo")) return "/mockups/veg/potato.jpg"
  
  // Spring Onion MUST be checked before general onion
  if (n.includes("spring onion") || n.includes("vengaya thaal")) return "/mockups/veg/spring_onion.jpg"
  if (n.includes("onion") || n.includes("vengayam") || n.includes("pyaz")) return "/mockups/veg/onion.jpg"
  if (n.includes("cucumber") || n.includes("vellarikkai") || n.includes("kheera")) return "/mockups/veg/cucumber.jpg"
  
  // Specific Bell Peppers & Capsicum MUST be checked before general chilli
  if (n.includes("red bell pepper") || n.includes("sigappu")) return "/mockups/veg/red_bell_pepper.jpg"
  if (n.includes("yellow bell pepper") || n.includes("manjal")) return "/mockups/veg/yellow_bell_pepper.jpg"
  if (n.includes("capsicum") || n.includes("kuda milagai") || n.includes("shimla")) return "/mockups/veg_capsicum_green.png"
  if (n.includes("chilli") || n.includes("milagai") || n.includes("mirch")) return "/mockups/veg/green_chilli.jpg"
  
  if (n.includes("cauliflower") || n.includes("kooliflower") || n.includes("phool gobhi")) return "/mockups/veg/cauliflower.jpg"
  if (n.includes("cabbage") || n.includes("muttakose") || n.includes("patta gobhi")) return "/mockups/veg/cabbage.jpg"
  if (n.includes("corn") || n.includes("solam") || n.includes("bhutta")) return "/mockups/veg/corn.jpg"
  if (n.includes("radish") || n.includes("mullangi") || n.includes("mooli")) return "/mockups/veg/radish.jpg"
  if (n.includes("lettuce") || n.includes("keerai") || n.includes("palak") || n.includes("spinach")) return "/mockups/veg/lettuce.jpg"
  if (n.includes("beetroot")) return "/mockups/veg/beetroot.jpg"
  if (n.includes("pumpkin") || n.includes("parangikkai") || n.includes("kaddu")) return "/mockups/veg/pumpkin.jpg"
  if (n.includes("mint") || n.includes("pudhina")) return "/mockups/veg/mint.jpg"
  if (n.includes("basil") || n.includes("rosemary") || n.includes("herbs")) return "/mockups/veg/rosemary.png"
  if (n.includes("turmeric") || n.includes("manjal") || n.includes("haldi")) return "/mockups/veg/turmeric.jpg"
  if (n.includes("amla") || n.includes("nellikai")) return "/mockups/veg/amla.jpg"
  if (n.includes("colocasia") || n.includes("seppankizhangu") || n.includes("arvi")) return "/mockups/veg/arvi.jpg"
  if (n.includes("papaya") || n.includes("pappalikkai")) return "/mockups/veg/raw_papaya.jpg"
  if (n.includes("zucchini")) return "/mockups/veg/zucchini.jpg"
  if (n.includes("ridge gourd") || n.includes("peerkangai") || n.includes("torai")) return "/mockups/veg/ridge_gourd.jpg"
  if (n.includes("broccoli")) return "/mockups/veg/broccoli.jpg"

  return "/mockups/veg_coriander.png"
}

function HomeCombinedGraphic({ className = "w-16 h-16" }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="50" cy="82" rx="38" ry="5" fill="#d1fae5" opacity="0.8" />
      <rect x="22" y="32" width="56" height="42" rx="8" fill="#f0fdf4" stroke="#059669" strokeWidth="2" />
      <path d="M16 34L50 12L84 34H16Z" fill="#059669" />
      <rect x="42" y="48" width="16" height="26" rx="3" fill="#047857" />
      <circle cx="46" cy="61" r="1.5" fill="#fef08a" />
      <circle cx="28" cy="46" r="9" fill="#ffffff" stroke="#059669" strokeWidth="1.5" />
      <path d="M25 43L31 49M31 43L25 49" stroke="#059669" strokeWidth="2" strokeLinecap="round" />
      <circle cx="72" cy="46" r="9" fill="#ffffff" stroke="#059669" strokeWidth="1.5" />
      <rect x="67" y="44" width="7" height="5" fill="#2563eb" />
      <circle cx="69" cy="50" r="1.5" fill="#1e293b" />
      <circle cx="75" cy="50" r="1.5" fill="#1e293b" />
    </svg>
  )
}

// ── 3 Main Top-Level Category Pillars ─────────────────────────────────
const MAIN_CATEGORIES = [
  {
    id: "for_you",
    label: "For You",
    subtitle: "Recommended & personalized services tailored for your home",
    badge: "Trending",
    badgeColor: "bg-emerald-100 text-emerald-800",
    graphic: ForYouGraphic,
    bgGradient: "from-emerald-50/80 to-teal-50/40",
    accentColor: "#059669",
  },
  {
    id: "food_health",
    label: "Food and Health",
    subtitle: "Daily groceries, farm-fresh vegetables & wellness essentials",
    badge: "Groceries & Vegetables",
    badgeColor: "bg-amber-100 text-amber-900",
    graphic: FoodHealthGraphic,
    bgGradient: "from-amber-50/80 to-orange-50/40",
    accentColor: "#d97706",
  },
  {
    id: "home_services_combined",
    label: "Home, Repair & Transport Services",
    subtitle: "Cleaning, repairs, appliances, painting, masonry & logistics",
    badge: "6 Core Services",
    badgeColor: "bg-teal-100 text-teal-900",
    graphic: HomeCombinedGraphic,
    bgGradient: "from-teal-50/80 to-cyan-50/40",
    accentColor: "#0d9488",
  },
]

// ── Curated Vegetables & Groceries Data with Tamil Names ────────
const VEGETABLE_ITEMS = [
  // Daily Essentials
  { name: "Coriander Leaves (Kothamalli)", unit: "100 g", price: 25, mrp: 31, discount: "19% OFF", delivery: "8 MINS", category: "Daily Essentials" },
  { name: "Onion (Vengayam)", unit: "1 kg", price: 41, mrp: 50, discount: "18% OFF", delivery: "8 MINS", category: "Daily Essentials" },
  { name: "Tomato (Thakkali)", unit: "1 kg", price: 58, mrp: 70, discount: "17% OFF", delivery: "8 MINS", category: "Daily Essentials" },
  { name: "Potato (Urulaikilangu)", unit: "1 kg", price: 22, mrp: 25, discount: "12% OFF", delivery: "8 MINS", category: "Daily Essentials" },
  { name: "Lady Finger (Vendakkai)", unit: "1 kg", price: 54, mrp: 70, discount: "23% OFF", delivery: "8 MINS", category: "Daily Essentials" },
  { name: "Ginger (Inji)", unit: "200 g", price: 75, mrp: 88, discount: "15% OFF", delivery: "8 MINS", category: "Herbs & Seasoning" },
  { name: "Garlic (Poondu)", unit: "200 g", price: 68, mrp: 85, discount: "20% OFF", delivery: "8 MINS", category: "Herbs & Seasoning" },
  { name: "Peeled Garlic (Uricha Poondu)", unit: "100 g", price: 54, mrp: 65, discount: "17% OFF", delivery: "8 MINS", category: "Herbs & Seasoning" },
  { name: "Lemon (Elumichai)", unit: "200 g", price: 41, mrp: 48, discount: "15% OFF", delivery: "8 MINS", category: "Daily Essentials" },
  { name: "Cucumber (Vellarikkai)", unit: "500 g", price: 52, mrp: 61, discount: "15% OFF", delivery: "8 MINS", category: "Daily Essentials" },
  // Herbs & Leafy
  { name: "Curry Leaves (Karuveppilai)", unit: "50 g", price: 15, mrp: 18, discount: "17% OFF", delivery: "8 MINS", category: "Herbs & Leafy" },
  { name: "Mint Leaves (Pudhina)", unit: "100 g", price: 26, mrp: 32, discount: "19% OFF", delivery: "8 MINS", category: "Herbs & Leafy" },
  { name: "Spring Onion (Vengaya Thaal)", unit: "150 g", price: 36, mrp: 42, discount: "14% OFF", delivery: "8 MINS", category: "Herbs & Leafy" },
  { name: "Green Lettuce (Salad Keerai)", unit: "100 g", price: 56, mrp: 64, discount: "13% OFF", delivery: "8 MINS", category: "Herbs & Leafy" },
  { name: "Fresh Rosemary & Herbs", unit: "10 g", price: 20, mrp: 25, discount: "20% OFF", delivery: "8 MINS", category: "Herbs & Leafy" },
  { name: "Drumstick (Murungakkai)", unit: "250 g", price: 35, mrp: 42, discount: "17% OFF", delivery: "8 MINS", category: "Herbs & Leafy" },
  // Gourds & Roots
  { name: "Bitter Gourd (Pavakkai)", unit: "250 g", price: 17, mrp: 19, discount: "11% OFF", delivery: "8 MINS", category: "Gourds & Roots" },
  { name: "Bottle Gourd (Suraikkai)", unit: "400 g", price: 21, mrp: 24, discount: "13% OFF", delivery: "8 MINS", category: "Gourds & Roots" },
  { name: "Ridge Gourd (Peerkangai)", unit: "500 g", price: 38, mrp: 48, discount: "21% OFF", delivery: "8 MINS", category: "Gourds & Roots" },
  { name: "Radish (Mullangi)", unit: "500 g", price: 52, mrp: 63, discount: "17% OFF", delivery: "8 MINS", category: "Gourds & Roots" },
  { name: "Beetroot (Beetroot)", unit: "500 g", price: 37, mrp: 44, discount: "16% OFF", delivery: "8 MINS", category: "Gourds & Roots" },
  { name: "Sweet Potato (Sakkaraivalli Kizhangu)", unit: "500 g", price: 69, mrp: 84, discount: "18% OFF", delivery: "8 MINS", category: "Gourds & Roots" },
  { name: "Raw Turmeric (Manjal Kizhangu)", unit: "200 g", price: 38, mrp: 43, discount: "12% OFF", delivery: "8 MINS", category: "Herbs & Seasoning" },
  { name: "Colocasia (Seppankizhangu)", unit: "250 g", price: 19, mrp: 21, discount: "10% OFF", delivery: "8 MINS", category: "Gourds & Roots" },
  // Organic & Exotic
  { name: "Brinjal (Kathirikai)", unit: "500 g", price: 25, mrp: 29, discount: "14% OFF", delivery: "8 MINS", category: "Organic & Exotic" },
  { name: "Green Chilli (Pachai Milagai)", unit: "100 g", price: 18, mrp: 22, discount: "18% OFF", delivery: "8 MINS", category: "Organic & Exotic" },
  { name: "Green Capsicum (Kuda Milagai)", unit: "250 g", price: 28, mrp: 35, discount: "20% OFF", delivery: "8 MINS", category: "Organic & Exotic" },
  { name: "Red Bell Pepper (Sigappu Kuda Milagai)", unit: "125 g", price: 45, mrp: 58, discount: "22% OFF", delivery: "8 MINS", category: "Organic & Exotic" },
  { name: "Yellow Bell Pepper (Manjal Kuda Milagai)", unit: "125 g", price: 61, mrp: 70, discount: "13% OFF", delivery: "8 MINS", category: "Organic & Exotic" },
  { name: "French Beans (Beans)", unit: "250 g", price: 31, mrp: 36, discount: "14% OFF", delivery: "8 MINS", category: "Organic & Exotic" },
  { name: "Cauliflower (Kooliflower)", unit: "1 pc (500g)", price: 38, mrp: 45, discount: "16% OFF", delivery: "8 MINS", category: "Organic & Exotic" },
  { name: "Cabbage (Muttakose)", unit: "400 g", price: 37, mrp: 44, discount: "16% OFF", delivery: "8 MINS", category: "Organic & Exotic" },
  { name: "Broccoli", unit: "300 g", price: 133, mrp: 167, discount: "20% OFF", delivery: "8 MINS", category: "Organic & Exotic" },
  { name: "Button Mushroom (Kaalan)", unit: "180 g", price: 47, mrp: 56, discount: "16% OFF", delivery: "8 MINS", category: "Organic & Exotic" },
  { name: "Pumpkin (Parangikkai)", unit: "500 g", price: 46, mrp: 50, discount: "8% OFF", delivery: "8 MINS", category: "Organic & Exotic" },
  { name: "Green Peas (Pattani)", unit: "250 g", price: 67, mrp: 81, discount: "17% OFF", delivery: "8 MINS", category: "Organic & Exotic" },
  { name: "Amla (Nellikai)", unit: "250 g", price: 64, mrp: 73, discount: "12% OFF", delivery: "8 MINS", category: "Organic & Exotic" },
  { name: "Raw Papaya (Pappalikkai)", unit: "400 g", price: 39, mrp: 45, discount: "13% OFF", delivery: "8 MINS", category: "Organic & Exotic" },
  { name: "Sweet Corn (Solam)", unit: "1 pc", price: 24, mrp: 30, discount: "20% OFF", delivery: "8 MINS", category: "Organic & Exotic" },
  // Gourds & Roots (continued)
  { name: "Green Zucchini", unit: "200 g", price: 30, mrp: 38, discount: "21% OFF", delivery: "8 MINS", category: "Gourds & Roots" }
]

const GROCERY_ITEMS = [
  {
    name: "Essential Dals & Grains Combo",
    unit: "Standard Combo Pack",
    price: 499,
    mrp: 599,
    discount: "16% OFF",
    delivery: "15 MINS",
    category: "Flours & Grains"
  },
  {
    name: "Monthly Kitchen Staples Pack",
    unit: "Family Pack",
    price: 999,
    mrp: 1199,
    discount: "16% OFF",
    delivery: "15 MINS",
    category: "Flours & Grains"
  }
]

const FOOD_HEALTH_SUB = [
  {
    id: "groceries",
    name: "Groceries",
    tagline: "Daily Essentials, Staples & Packaged Goods",
    graphic: GroceriesGraphic,
    photo: "/mockups/groceries_realistic.png",
    badge: "Coming Soon",
    items: GROCERY_ITEMS,
  },
  {
    id: "vegetables",
    name: "Vegetables",
    tagline: "Farm-Fresh & 100% Organic Green Vegetables",
    graphic: VegetablesGraphic,
    photo: "/mockups/vegetables_realistic.png",
    badge: "8-min Farm Delivery",
    items: [], // populated dynamically from API
  },
]

// ── For You Curated Sub-Services ───────────────────────────────────────
const FOR_YOU_SUB = [
  { name: "Full House Deep Cleaning", subtitle: "Complete home sanitization & scrub", graphic: FullHouseCleaningGraphic, categoryId: "cleaning", badge: "Most Booked" },
  { name: "AC Master Service", subtitle: "Filter cleaning, coil wash & gas check", graphic: AcGraphic, categoryId: "hvac", badge: "Summer Essential" },
  { name: "Instant Bike Courier", subtitle: "Documents & parcels delivered under 45 mins", graphic: TwoWheelerGraphic, action: "two_wheeler", badge: "Instant" },
  { name: "Express Electrician & Plumber", subtitle: "Wiring, switchboard & pipe repairs", graphic: ElectricianGraphic, categoryId: "electrical", badge: "Verified Pro" },
  { name: "Interior Wall Painting", subtitle: "Dustless sanding & premium finish", graphic: PaintRoller, categoryId: "painting", badge: "Top Rated" },
  { name: "Mini Truck Transport", subtitle: "Hassle-free goods & tempo booking", graphic: TruckGraphic, action: "truck", badge: "Hosur Special" },
]

// ── Real photos already in the project (public/mockups) ─────────────────
const CATEGORIES = [
  { label: "Home Services & Pest Control", icon: SprayCan, photo: "/mockups/service_cleaning.png", bg: "bg-indigo-50", ring: "border-indigo-100", fg: "text-indigo-600", hoverBg: "group-hover:bg-indigo-100", serviceCategoryId: "pest_control" },
  { label: "Paintings", icon: PaintRoller, photo: "/mockups/service_maintenance.png", bg: "bg-amber-50", ring: "border-amber-100", fg: "text-amber-600", hoverBg: "group-hover:bg-amber-100", serviceCategoryId: "painting" },
  { label: "Mason", icon: Building2, photo: "/mockups/service_building.png", bg: "bg-sky-50", ring: "border-sky-100", fg: "text-sky-600", hoverBg: "group-hover:bg-sky-100", serviceCategoryId: "mason" },
  { label: "AC & Appliance", icon: AirVent, photo: "/mockups/service_hvac.png", bg: "bg-rose-50", ring: "border-rose-100", fg: "text-rose-600", hoverBg: "group-hover:bg-rose-100", serviceCategoryId: "hvac" },
  { label: "Electrician, Plumbing & Carpentry", icon: Hammer, photo: "/mockups/service_electrical.png", bg: "bg-violet-50", ring: "border-violet-100", fg: "text-violet-600", hoverBg: "group-hover:bg-violet-100", serviceCategoryId: "electrical" },
  { label: "Goods & Transports", icon: Boxes, photo: "/mockups/service_transport.jpg", bg: "bg-teal-50", ring: "border-teal-100", fg: "text-teal-600", hoverBg: "group-hover:bg-teal-100", serviceCategoryId: null },
]

const HOME_SERVICES_SUB = [
  { name: "Kitchen Cleaning", graphic: KitchenCleaningGraphic, categoryId: "kitchen_cleaning" },
  { name: "Sofa Cleaning", graphic: SofaCleaningGraphic, categoryId: "sofa_cleaning" },
  { name: "Bathroom Cleaning", graphic: BathroomCleaningGraphic, categoryId: "bathroom_cleaning" },
  { name: "Full House Cleaning", graphic: FullHouseCleaningGraphic, categoryId: "cleaning" },
]

const PEST_CONTROL_SUB = [
  { name: "Cockroach & Termite Control", graphic: CockroachControlGraphic, categoryId: "pest_control" },
  { name: "Ants & Bed Bugs Control", graphic: AntBedBugControlGraphic, categoryId: "pest_control" },
]

const TRUST_STRIP = [
  { icon: ShieldCheck, title: "Verified & Background Checked", body: "Skilled professionals you can trust." },
  { icon: BadgeCheck, title: "Transparent & Fair Pricing", body: "No hidden charges, what you see is what you pay." },
  { icon: Clock, title: "On-time Service", body: "We value your time as much as you do." },
  { icon: Award, title: "Service Warranty", body: "We stand by the quality of our work." },
  { icon: Headphones, title: "24/7 Customer Support", body: "We're here whenever you need us." },
]

const OFFERS = [
  { tag: "UPTO", big: "20% OFF", sub: "on Home Cleaning", bg: "bg-emerald-50" },
  { tag: "FLAT", big: "15% OFF", sub: "on Painting", bg: "bg-teal-50" },
  { tag: "UPTO", big: "₹500 OFF", sub: "on AC Service", bg: "bg-lime-50" },
]

const STEPS = [
  { icon: ClipboardList, title: "Choose Service", body: "Select the service you need" },
  { icon: CalendarDays, title: "Pick Date & Time", body: "Choose a convenient slot" },
  { icon: UserCheck, title: "We Assign Expert", body: "We'll assign the best professional" },
  { icon: DoorOpen, title: "Service at Your Door", body: "Expert arrives & gets the job done" },
  { icon: Wallet, title: "Pay & Rate", body: "Make payment & share your feedback" },
]

const STATS = [
  { value: "45K+", label: "Happy Customers" },
  { value: "1200+", label: "Verified Experts" },
  { value: "85K+", label: "Services Completed" },
  { value: "30 min", label: "Average Response" },
  { value: "4.8/5", label: "Average Rating" },
]

const PROFESSIONALS = [
  { name: "Sarah J.", role: "Licensed Electrician", rating: "4.9", jobs: "620+ jobs", photo: "/mockups/service_electrical.png" },
  { name: "Elite Plumbing", role: "Plumbing Specialist", rating: "4.8", jobs: "540+ jobs", photo: "/mockups/service_plumbing.png" },
  { name: "Advanced Climate", role: "AC & Appliance Tech", rating: "4.9", jobs: "410+ jobs", photo: "/mockups/service_hvac.png" },
  { name: "Eco Shine", role: "Home Cleaning Pro", rating: "4.7", jobs: "780+ jobs", photo: "/mockups/service_cleaning.png" },
]

const TESTIMONIALS = [
  { name: "Kavya R.", initials: "KR", text: "Booked cleaning service and the professional was punctual and did a fantastic job!" },
  { name: "Arvind S.", initials: "AS", text: "Very professional electrician. Fixed the issue quickly and the pricing was fair." },
  { name: "Priya M.", initials: "PM", text: "Great experience with the painting service. Highly recommend CalServices!" },
]

function Logo() {
  return (
    <div className="flex items-center gap-2 select-none">
      <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
        <Home className="w-5 h-5" strokeWidth={2.5} />
      </div>
      <span className="text-lg font-extrabold tracking-tight text-slate-900">CalServices</span>
    </div>
  )
}

// ── Location dropdown (fixed city list) ───────────────────────────────────
const CITIES = ["Hosur", "Coimbatore", "Chennai"]

function LocationDropdown({ className = "" }) {
  const [city, setCity] = useState(CITIES[0])
  return (
    <div className={`relative flex items-center gap-1 text-sm font-medium text-slate-600 border border-slate-200 rounded-full pl-3 pr-2 py-1.5 hover:border-slate-300 ${className}`}>
      <MapPin className="w-4 h-4 text-orange-500 shrink-0" />
      <select
        value={city}
        onChange={(e) => setCity(e.target.value)}
        className="bg-transparent outline-none appearance-none pr-4 cursor-pointer"
      >
        {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <ChevronDown className="w-3.5 h-3.5 absolute right-2 pointer-events-none" />
    </div>
  )
}

export function LandingPage() {
  const { user, refreshMe } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [query, setQuery] = useState("")
  const [testimonialIdx, setTestimonialIdx] = useState(0)
  const location = useLocation()
  const [modalCart, setModalCart] = useState(() => (location.state?.cart || []).filter(c => c.categoryName !== "Painting" && c.categoryName !== "Mason" && !c.id.includes("paint") && !c.id.includes("mason")))
  const [isGoodsModalOpen, setIsGoodsModalOpen] = useState(location.state?.openGoodsModal || false)
  const [isElecModalOpen, setIsElecModalOpen] = useState(location.state?.openElecModal || false)
  const [isAcModalOpen, setIsAcModalOpen] = useState(location.state?.openAcModal || false)
  const [isHomePestModalOpen, setIsHomePestModalOpen] = useState(location.state?.openHomePestModal || false)
  const [isForYouModalOpen, setIsForYouModalOpen] = useState(false)
  const [isFoodHealthModalOpen, setIsFoodHealthModalOpen] = useState(
    () => Boolean(location.state?.openFoodHealthModal || location.state?.openVegetablesModal || location.state?.openFoodSubModuleId) || false
  )
  const [isHomeServicesCombinedModalOpen, setIsHomeServicesCombinedModalOpen] = useState(false)
  const [foodHealthSub, setFoodHealthSub] = useState(FOOD_HEALTH_SUB)
  const [selectedFoodSubModuleId, setSelectedFoodSubModuleId] = useState(
    () => location.state?.openFoodSubModuleId || (location.state?.openVegetablesModal ? "vegetables" : null)
  )
  const selectedFoodSubModule = useMemo(() => {
    return foodHealthSub.find((sub) => sub.id === selectedFoodSubModuleId) || null
  }, [foodHealthSub, selectedFoodSubModuleId])
  const [foodCart, setFoodCart] = useState(() => location.state?.foodCart || {})
  const [foodOrderPlaced, setFoodOrderPlaced] = useState(false)

  useEffect(() => {
    if (location.state?.openVegetablesModal || location.state?.openFoodSubModuleId || location.state?.openFoodHealthModal) {
      setIsFoodHealthModalOpen(true)
      setSelectedFoodSubModuleId(location.state?.openFoodSubModuleId || "vegetables")
      if (location.state?.foodCart) {
        setFoodCart(location.state.foodCart)
      }
      // Clear the temporary state from router history so future navigations don't accidentally re-trigger it
      navigate(".", { replace: true, state: {} })
    }
  }, [location.state, navigate])
  const [variantModalItem, setVariantModalItem] = useState(null)
  const [vegCategoryFilter, setVegCategoryFilter] = useState("All")
  const [vegSearchQuery, setVegSearchQuery] = useState("")
  const [vegApiItems, setVegApiItems] = useState(VEGETABLE_ITEMS)
  const [showCustomerEntryModal, setShowCustomerEntryModal] = useState(false)
  const [showAccountPortal, setShowAccountPortal] = useState(false)
  const [activeAccountTab, setActiveAccountTab] = useState("My Profile")
  const [showLocationPickerModal, setShowLocationPickerModal] = useState(false)
  const [activeLocationLabel, setActiveLocationLabel] = useState(() => {
    return localStorage.getItem("calservice_user_location") || null;
  })
  const [packagesData, setPackagesData] = useState({})

  useEffect(() => {
    async function loadCatalog() {
      try {
        const svcRes = await apiRequest("/catalog/services/")
        if (svcRes.success) {
          const pkgs = {}
          svcRes.data.forEach(s => {
            const cid = s.category.toString()
            if (!pkgs[cid]) pkgs[cid] = []
            pkgs[cid].push({
              id: s.id.toString(),
              name: s.name,
              price: parseFloat(s.price),
              priceStr: "₹" + s.price,
              duration: s.duration || "1 hr",
              payment_policy: s.payment_policy,
              image: s.image,
              includes: s.includes || [],
              excludes: s.excludes || [],
              popular: !!s.popular,
              tag: s.tag || ""
            })
          })
          setPackagesData(pkgs)
        }
      } catch (err) {
        console.error(err)
      }
    }
    loadCatalog()
  }, [])

  const [homeConfig, setHomeConfig] = useState(() => getHomePageConfig())

  useEffect(() => {
    let isMounted = true
    fetchPublishedHomePageConfig().then((cfg) => {
      if (cfg && isMounted) {
        setHomeConfig(cfg)
      }
    })

    const handleConfigUpdate = (e) => {
      setHomeConfig(e.detail || getHomePageConfig())
    }
    window.addEventListener("calservices:homepage_updated", handleConfigUpdate)
    return () => {
      isMounted = false
      window.removeEventListener("calservices:homepage_updated", handleConfigUpdate)
    }
  }, [])

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = parseFloat(pos.coords.latitude.toFixed(6))
          const lng = parseFloat(pos.coords.longitude.toFixed(6))
          try {
            const display = await getAddress(lat, lng)
            if (display) {
              setActiveLocationLabel(display)
              localStorage.setItem("calservice_user_location", display)
            }
          } catch (e) { }
        },
        (err) => {
          console.warn("Live location detection warning:", err)
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
      )
    }
  }, [])

  // Helper to dynamically categorize vegetable items based on their names
  const getVegetableCategory = (pkgName) => {
    const lowerName = pkgName.toLowerCase()
    if (
      lowerName.includes("coriander") ||
      lowerName.includes("curry leaves") ||
      lowerName.includes("mint") ||
      lowerName.includes("lettuce") ||
      lowerName.includes("rosemary") ||
      lowerName.includes("drumstick")
    ) {
      return "Herbs & Leafy"
    }
    if (lowerName.includes("spring onion")) {
      return "Herbs & Leafy"
    }
    if (
      lowerName.includes("ginger") ||
      lowerName.includes("garlic") ||
      lowerName.includes("turmeric")
    ) {
      return "Herbs & Seasoning"
    }
    if (
      lowerName.includes("bitter gourd") ||
      lowerName.includes("bottle gourd") ||
      lowerName.includes("ridge gourd") ||
      lowerName.includes("radish") ||
      lowerName.includes("beetroot") ||
      lowerName.includes("sweet potato") ||
      lowerName.includes("colocasia") ||
      lowerName.includes("zucchini")
    ) {
      return "Gourds & Roots"
    }
    if (
      lowerName.includes("brinjal") ||
      lowerName.includes("chilli") ||
      lowerName.includes("capsicum") ||
      lowerName.includes("bell pepper") ||
      lowerName.includes("beans") ||
      lowerName.includes("cauliflower") ||
      lowerName.includes("cabbage") ||
      lowerName.includes("broccoli") ||
      lowerName.includes("mushroom") ||
      lowerName.includes("pumpkin") ||
      lowerName.includes("peas") ||
      lowerName.includes("amla") ||
      lowerName.includes("papaya") ||
      lowerName.includes("sweet corn")
    ) {
      return "Organic & Exotic"
    }
    return "Daily Essentials"
  }

  // Fetch live sub-services (Groceries, Vegetables) under vegetables_groceries category
  useEffect(() => {
    apiRequest("/catalog/sub-services/?category_slug=vegetables_groceries")
      .then((res) => {
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          const apiServices = res.data.map((svc) => ({
            id: svc.slug, // e.g. "vegetables", "groceries"
            db_id: svc.id,
            name: svc.name,
            desc: svc.description,
            tagline: svc.description,
            badge: svc.slug === "groceries" ? "Coming Soon" : "8-min Farm Express",
            image: svc.image || (svc.slug === "groceries" ? "/mockups/groceries_realistic.png" : "/mockups/vegetables_realistic.png"),
            items: svc.slug === "groceries" ? GROCERY_ITEMS : [],
          }))

          // Fetch active vegetable packages
          apiRequest("/catalog/services/?service_slug=vegetables&status=ACTIVE")
            .then((pkgRes) => {
              if (pkgRes.success && Array.isArray(pkgRes.data)) {
                const apiVegs = pkgRes.data.map((pkg) => ({
                  id: pkg.id,
                  name: pkg.name,
                  unit: pkg.duration || "1 unit",
                  price: Math.round(Number(pkg.price || pkg.base_price) || 0),
                  mrp: pkg.offer_price ? Math.round(Number(pkg.price || pkg.base_price) || 0) : null,
                  discount: pkg.tag || "",
                  delivery: pkg.duration || "8 MINS",
                  category: getVegetableCategory(pkg.name),
                  image: pkg.image || null,
                }))
                setVegApiItems(apiVegs)
                setFoodHealthSub(
                  apiServices.map((sub) =>
                    sub.id === "vegetables" ? { ...sub, items: apiVegs } : sub
                  )
                )
              } else {
                setFoodHealthSub(apiServices)
              }
            })
            .catch(() => {
              setFoodHealthSub(apiServices)
            })
        }
      })
      .catch((err) => {
        console.error("Failed to load sub-services:", err)
      })
  }, [])

  useEffect(() => {
    if (location.state?.openHomePestModal) setIsHomePestModalOpen(true)
    if (location.state?.openAcModal) setIsAcModalOpen(true)
    if (location.state?.openElecModal) setIsElecModalOpen(true)
    if (location.state?.openGoodsModal) setIsGoodsModalOpen(true)
  }, [location.state])

  const handleCloseCategory = () => {
    setModalCart(prev => prev.filter(c => !c.id.includes("mason") && !c.id.includes("paint")));
    const rawCatKey = (activeCategory?.id || activeCategory?.slug || activeCategoryId || "").toLowerCase()
    if (["hvac", "ac", "appliance"].some(k => rawCatKey.includes(k))) {
      navigate("/home", { state: { openAcModal: true } })
    } else if (["electrical", "plumbing", "carpentry", "elec"].some(k => rawCatKey.includes(k))) {
      navigate("/home", { state: { openElecModal: true } })
    } else if (["goods", "transport"].some(k => rawCatKey.includes(k))) {
      navigate("/home", { state: { openGoodsModal: true } })
    } else if (["painting", "mason"].some(k => rawCatKey.includes(k))) {
      navigate("/home")
    } else {
      navigate("/home", { state: { openHomePestModal: true } })
    }
  }

  const resolveCartArg = (cartArg) => {
    return Array.isArray(cartArg) ? cartArg : (Array.isArray(modalCart) ? modalCart : [])
  }

  const cleanConsultationItems = (cartArray) => {
    const list = resolveCartArg(cartArray);
    return list.filter(c => c && typeof c === "object" && c.categoryName !== "Painting" && c.categoryName !== "Mason" && c.id && typeof c.id === "string" && !c.id.includes("paint") && !c.id.includes("mason"));
  };

  const goToBooking = () => navigate(routes.booking)
  const goToLogin = () => setShowCustomerEntryModal(true)
  const goToCategoryServices = (serviceCategoryId, subTabName) => {
    let url = serviceCategoryId ? `${routes.booking_services}?category=${serviceCategoryId}` : routes.booking_services;
    if (subTabName) {
      const encoded = encodeURIComponent(subTabName);
      url += `&subtab=${encoded}&subTab=${encoded}`;
    }
    navigate(url);
  };

  // Category clicked on this page opens the existing package/services
  // popup right here, instead of navigating to the old BookingPage UI.
  const activeCategoryId = searchParams.get("category")
  const activeSubTabParam = searchParams.get("subtab")
  const activeCategory = activeCategoryId
    ? (BOOKING_CATEGORIES.find(c => 
        c.id === activeCategoryId || 
        c.slug === activeCategoryId || 
        c.id === `${activeCategoryId}_cleaning`
      ) || { id: activeCategoryId, name: activeCategoryId.replace(/_/g, " ") })
    : null

  // Close popup on Escape key and prevent background scroll when open
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setIsGoodsModalOpen(false)
        setIsElecModalOpen(false)
        setIsAcModalOpen(false)
        setIsHomePestModalOpen(false)
        setIsForYouModalOpen(false)
        setIsFoodHealthModalOpen(false)
        setIsHomeServicesCombinedModalOpen(false)
      }
    }
    if (isGoodsModalOpen || isElecModalOpen || isAcModalOpen || isHomePestModalOpen || isForYouModalOpen || isFoodHealthModalOpen || isHomeServicesCombinedModalOpen) {
      window.addEventListener("keydown", handleKeyDown)
      document.body.style.overflow = "hidden"
    } else {
      window.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = ""
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = ""
    }
  }, [isGoodsModalOpen, isElecModalOpen, isAcModalOpen, isHomePestModalOpen, isForYouModalOpen, isFoodHealthModalOpen, isHomeServicesCombinedModalOpen])

  const SEARCH_ROTATING_SERVICES = useMemo(() => [
    "AC Repair & Servicing",
    "Kitchen Deep Cleaning",
    "Sofa Shampooing",
    "Bathroom Sanitization",
    "Plumbing Leak Repair",
    "Fan & Electrical Service",
    "Pest Control Treatment",
    "Washing Machine Repair"
  ], []);

  const [searchRotateIdx, setSearchRotateIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setSearchRotateIdx((prev) => (prev + 1) % SEARCH_ROTATING_SERVICES.length);
    }, 2800);
    return () => clearInterval(timer);
  }, [SEARCH_ROTATING_SERVICES.length]);

  const allServicesCatalog = useMemo(() => [
    { id: "kc-1", name: "Occupied Kitchen Cleaning (Basic)", price: 999, categoryName: "Kitchen Cleaning", image: "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=400&q=80&fit=crop", catId: "kitchen_cleaning" },
    { id: "kc-2", name: "Occupied Kitchen Cleaning (Deep Clean)", price: 1499, categoryName: "Kitchen Cleaning", image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400&q=80&fit=crop", catId: "kitchen_cleaning" },
    { id: "kc-3", name: "Empty Kitchen Deep Cleaning", price: 1799, categoryName: "Kitchen Cleaning", image: "https://images.unsplash.com/photo-1507089947368-19c1da9775ae?w=400&q=80&fit=crop", catId: "kitchen_cleaning" },
    { id: "sc-1", name: "Sofa Deep Cleaning & Shampooing", price: 799, categoryName: "Sofa Cleaning", image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=80&fit=crop", catId: "sofa_cleaning" },
    { id: "bc-1", name: "Bathroom Deep Cleaning & Sanitization", price: 499, categoryName: "Bathroom Cleaning", image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400&q=80&fit=crop", catId: "bathroom_cleaning" },
    { id: "ac-1", name: "Power Jet AC Foam Service", price: 599, categoryName: "AC & Heating", image: "https://images.unsplash.com/photo-1621905252507-b35492d04029?w=400&q=80&fit=crop", catId: "hvac" },
    { id: "ac-2", name: "Anti-Rust Protective Coating", price: 249, categoryName: "AC & Heating", image: "https://images.unsplash.com/photo-1610486842247-7505ed272fc4?w=400&q=80&fit=crop", catId: "hvac" },
    { id: "ac-3", name: "AC Gas Leak Audit & Refill", price: 899, categoryName: "AC & Heating", image: "https://images.unsplash.com/photo-1621905252507-b35492d04029?w=400&q=80&fit=crop", catId: "hvac" },
    { id: "el-1", name: "Fan Repair & Installation", price: 149, categoryName: "Electrical", image: "https://images.unsplash.com/photo-1558611848-73f7eb4001a1?w=400&q=80&fit=crop", catId: "electrical" },
    { id: "pl-1", name: "Tap & Basin Leak Repair", price: 199, categoryName: "Plumbing", image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400&q=80&fit=crop", catId: "plumbing" },
    { id: "cp-1", name: "Furniture Repair & Assembly", price: 299, categoryName: "Carpentry", image: "https://images.unsplash.com/photo-1538688525198-9b88f6f53126?w=400&q=80&fit=crop", catId: "carpentry" },
    { id: "pc-1", name: "Cockroach & Ant Pest Control", price: 699, categoryName: "Pest Control", image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400&q=80&fit=crop", catId: "pest_control" },
    { id: "app-1", name: "Automatic Washing Machine Service", price: 499, categoryName: "Appliance Repair", image: "https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=400&q=80&fit=crop", catId: "appliance_repair" }
  ], []);

  const searchResults = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();
    return allServicesCatalog.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.categoryName.toLowerCase().includes(q)
    );
  }, [query, allServicesCatalog]);

  if (activeCategoryId) {
    const displayLocationText = activeLocationLabel ||
      (typeof user?.last_known_location === "string" ? user?.last_known_location : user?.last_known_location?.label) ||
      (typeof user?.lastKnownLocation === "string" ? user?.lastKnownLocation : user?.lastKnownLocation?.label) ||
      user?.address || "Hosur, Tamil Nadu";

    return (
      <>
        <div className="min-h-screen bg-[#F7FAF9] text-slate-800 flex flex-col" style={{ animation: "fadeUp 0.4s ease both" }}>
          {/* Urban Style Header for Service Choosing View */}
          <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-100 shadow-2xs">
            <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">

              {/* Logo & Urban Location Selector Pill */}
              <div className="flex items-center gap-3 sm:gap-6">
                <Logo />

                <div className="h-6 w-px bg-slate-200 hidden sm:block" />

                {/* Urban Location Selector Pill (Matching exact home page location view style) */}
                <button
                  type="button"
                  onClick={() => setShowLocationPickerModal(true)}
                  className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-slate-200 hover:border-slate-300 bg-slate-50/80 hover:bg-white text-xs font-extrabold text-slate-800 transition-all cursor-pointer shadow-2xs max-w-[220px] sm:max-w-[320px] truncate"
                  title="Select Location"
                >
                  <MapPin className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span className="truncate">{displayLocationText}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-auto" />
                </button>
              </div>

              {/* Urban Style Service Search Box (Matching exact screenshot structure & animated rotating text) */}
              <div className="relative max-w-[340px] w-full hidden sm:block">
                <div className="relative flex items-center bg-white border border-slate-200 hover:border-slate-300 focus-within:border-emerald-500 rounded-xl px-3.5 py-2 shadow-2xs transition-all">
                  <Search className="w-4 h-4 text-slate-400 shrink-0 mr-2.5 pointer-events-none" />

                  <div className="relative flex-1 flex items-center min-w-0">
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      className="w-full bg-transparent text-xs font-extrabold text-slate-800 outline-none z-10"
                    />
                    {!query && (
                      <div className="absolute inset-0 flex items-center pointer-events-none overflow-hidden select-none">
                        <span className="text-xs font-medium text-slate-400 mr-1 shrink-0">Search for</span>
                        <AnimatePresence mode="wait">
                          <motion.span
                            key={searchRotateIdx}
                            initial={{ opacity: 0, y: 7 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -7 }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                            className="text-xs font-bold text-slate-500 truncate"
                          >
                            '{SEARCH_ROTATING_SERVICES[searchRotateIdx]}'...
                          </motion.span>
                        </AnimatePresence>
                      </div>
                    )}
                  </div>

                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery("")}
                      className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer ml-1.5 shrink-0"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                {/* Live Search Results Dropdown (Visible one-by-one with image, category, and price) */}
                <AnimatePresence>
                  {query.trim() && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 max-h-80 overflow-y-auto z-50 p-2 space-y-1"
                    >
                      {searchResults.length > 0 ? (
                        searchResults.map((svc) => (
                          <div
                            key={svc.id}
                            onClick={() => {
                              setQuery("");
                              if (activeCategoryId !== svc.catId) {
                                navigate(`/booking/services?category=${svc.catId}`);
                              }
                            }}
                            className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors group"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              {svc.image && (
                                <img src={svc.image} alt={svc.name} className="w-8 h-8 rounded-lg object-cover shrink-0" />
                              )}
                              <div className="min-w-0">
                                <div className="text-xs font-extrabold text-slate-800 truncate group-hover:text-emerald-700">{svc.name}</div>
                                <div className="text-[10px] font-bold text-emerald-600">{svc.categoryName}</div>
                              </div>
                            </div>
                            <div className="text-xs font-black text-slate-900 shrink-0 ml-2">
                              ₹{svc.price}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-3 text-center text-xs font-bold text-slate-400">
                          No services matching "{query}"
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

            </div>
          </header>

          {/* Full Page View Wrapper */}
          <main className={`flex-1 max-w-7xl w-full mx-auto px-6 ${activeCategory ? "pt-4 pb-0" : "py-10"}`}>
            {activeCategory && (
              (activeCategory.id === "kitchen_cleaning" || activeCategory.slug === "kitchen_cleaning" || String(activeCategory.id) === "kitchen_cleaning" || activeCategory.name?.toLowerCase()?.includes("kitchen")) ? (
                <KitchenCleaningModal
                  category={activeCategory}
                  cart={modalCart}
                  setCart={setModalCart}
                  onClose={handleCloseCategory}
                  onCheckout={(customCart) => navigate(routes.booking_checkout, { state: { category: activeCategory, cart: resolveCartArg(customCart) } })}
                />
              ) : (activeCategory.id === "sofa_cleaning" || activeCategory.slug === "sofa_cleaning" || String(activeCategory.id) === "sofa_cleaning" || activeCategory.name?.toLowerCase()?.includes("sofa")) ? (
                <SofaCleaningModal
                  category={activeCategory}
                  cart={modalCart}
                  setCart={setModalCart}
                  onClose={handleCloseCategory}
                  onCheckout={(customCart) => navigate(routes.booking_checkout, { state: { category: activeCategory, cart: resolveCartArg(customCart) } })}
                />
              ) : (activeCategory.id === "bathroom_cleaning" || activeCategory.slug === "bathroom_cleaning" || String(activeCategory.id) === "bathroom_cleaning" || activeCategory.name?.toLowerCase()?.includes("bathroom")) ? (
                <BathroomCleaningModal
                  category={activeCategory}
                  cart={modalCart}
                  setCart={setModalCart}
                  onClose={handleCloseCategory}
                  onCheckout={(customCart) => navigate(routes.booking_checkout, { state: { category: activeCategory, cart: resolveCartArg(customCart) } })}
                />
              ) : (activeCategory.id === "painting" || activeCategory.slug === "painting" || String(activeCategory.id) === "painting" || activeCategory.name?.toLowerCase() === "painting") ? (
                <PaintingPackageModal
                  category={activeCategory}
                  cart={modalCart}
                  setCart={setModalCart}
                  packagesData={packagesData}
                  onClose={handleCloseCategory}
                  onCheckout={(customCart) => {
                    const finalCart = resolveCartArg(customCart);
                    setModalCart(cleanConsultationItems(finalCart));
                    navigate(routes.booking_checkout, { state: { category: activeCategory, cart: finalCart } });
                  }}
                  onGetEstimate={(customCart) => {
                    const finalCart = resolveCartArg(customCart);
                    setModalCart(cleanConsultationItems(finalCart));
                    navigate(routes.booking_checkout, { state: { category: activeCategory, cart: finalCart, triggerLocPicker: true } });
                  }}
                />
              ) : (activeCategory.id === "mason" || activeCategory.slug === "mason" || String(activeCategory.id) === "mason" || activeCategory.name?.toLowerCase() === "mason") ? (
                <MasonPackageModal
                  category={activeCategory}
                  cart={modalCart}
                  setCart={setModalCart}
                  packagesData={packagesData}
                  onClose={handleCloseCategory}
                  onCheckout={(customCart) => {
                    const finalCart = resolveCartArg(customCart);
                    setModalCart(cleanConsultationItems(finalCart));
                    navigate(routes.booking_checkout, { state: { category: activeCategory, cart: finalCart } });
                  }}
                  onGetEstimate={(customCart) => {
                    const finalCart = resolveCartArg(customCart);
                    setModalCart(cleanConsultationItems(finalCart));
                    navigate(routes.booking_checkout, { state: { category: activeCategory, cart: finalCart, triggerLocPicker: true } });
                  }}
                />
              ) : (activeCategory.id === "pest_control" || activeCategory.slug === "pest_control" || activeSubTabParam === "Cockroach & Termite Control" || activeSubTabParam === "Cockroach Control" || activeSubTabParam === "Termite Control") && (activeSubTabParam !== "Ants & Bed Bugs Control" && activeSubTabParam !== "Ants Control" && activeSubTabParam !== "Bedbugs Control" && activeSubTabParam !== "Ants and bed bugs control") ? (
                <CockroachControlModal
                  category={{ id: "pest_control", name: "Pest Control" }}
                  cart={modalCart}
                  setCart={setModalCart}
                  initialTab={activeSubTabParam === "Termite Control" ? "termite" : "cockroach"}
                  onClose={handleCloseCategory}
                  onCheckout={(customCart) => {
                    const finalCart = resolveCartArg(customCart);
                    setModalCart(finalCart);
                    navigate(routes.booking_checkout, { state: { category: activeCategory, cart: finalCart } });
                  }}
                />
              ) : (activeCategory.id === "pest_control" || activeCategory.slug === "pest_control" || activeSubTabParam === "Ants & Bed Bugs Control" || activeSubTabParam === "Ants Control" || activeSubTabParam === "Bedbugs Control" || activeSubTabParam === "Ants and bed bugs control") ? (
                <AntsBedBugsControlModal
                  category={{ id: "pest_control", name: "Pest Control" }}
                  cart={modalCart}
                  setCart={setModalCart}
                  initialTab={activeSubTabParam === "Ants Control" ? "ants" : "bedbugs"}
                  onClose={handleCloseCategory}
                  onCheckout={(customCart) => {
                    const finalCart = resolveCartArg(customCart);
                    setModalCart(finalCart);
                    navigate(routes.booking_checkout, { state: { category: activeCategory, cart: finalCart } });
                  }}
                />
              ) : (
                <CustomCleaningPackageModal
                  category={activeCategory}
                  cart={modalCart}
                  setCart={setModalCart}
                  isFullPage={true}
                  onClose={handleCloseCategory}
                  onCheckout={(customCart) => {
                    const finalCart = resolveCartArg(customCart);
                    setModalCart(cleanConsultationItems(finalCart));
                    navigate(routes.booking_checkout, { state: { category: activeCategory, cart: finalCart } });
                  }}
                />
              )
            )}
          </main>
        </div>
        <BkStyles />

        {showLocationPickerModal && (
          <AddAddressSearchModal
            onClose={() => setShowLocationPickerModal(false)}
            onSelectLocation={async (locStr) => {
              setShowLocationPickerModal(false)
              if (locStr) {
                const labelStr = typeof locStr === "string" ? locStr : (locStr?.formatted_address || locStr?.locality || locStr?.city || "")
                setActiveLocationLabel(labelStr)
                localStorage.setItem("calservice_user_location", labelStr)
                if (user) {
                  try {
                    await apiUpdateCustomerLastLocation({
                      label: labelStr,
                      detected_at: new Date().toISOString()
                    })
                  } catch (e) { }
                  if (typeof refreshMe === "function") refreshMe()
                }
              }
            }}
          />
        )}
      </>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-[#F7FAF9] text-slate-800" style={{ animation: "fadeUp 0.4s ease both" }}>
        {/* ── Header ─────────────────────────────────────────── */}
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-100 shadow-sm">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-6">
            <div className="flex items-center gap-2 select-none cursor-pointer" onClick={() => navigate(routes.landing)}>
              <div className="w-9 h-9 rounded-xl bg-teal-600 flex items-center justify-center text-white">
                <Home className="w-5 h-5" strokeWidth={2.5} />
              </div>
              <span className="text-lg font-extrabold tracking-tight text-slate-900">CalServices</span>
            </div>

            <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-slate-600">
              <a href="#home" className="text-teal-600 font-semibold">Home</a>
              <a href="#categories" className="hover:text-slate-900 transition-colors">Services</a>
              <a href="#how-it-works" className="hover:text-slate-900 transition-colors">How It Works</a>
              <a href="#professionals" className="hover:text-slate-900 transition-colors">Professionals</a>
              <a href="#about" className="hover:text-slate-900 transition-colors">About Us</a>
            </nav>

            <div className="flex items-center gap-8">
              {/* Location Selector Pill (Matching exact home page location view style) */}
              <button
                type="button"
                onClick={() => setShowLocationPickerModal(true)}
                className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-slate-200 hover:border-slate-300 bg-slate-50/80 hover:bg-white text-xs font-extrabold text-slate-800 transition-all cursor-pointer shadow-2xs max-w-[220px] sm:max-w-[320px] truncate"
                title="Select Location"
              >
                <MapPin className="w-4 h-4 text-indigo-600 shrink-0" />
                <span className="truncate">
                  {(() => {
                    if (activeLocationLabel) return activeLocationLabel
                    const locObj = user?.last_known_location || user?.lastKnownLocation
                    if (locObj) {
                      if (typeof locObj === "string" && locObj.trim()) return locObj
                      if (locObj.label) return locObj.label
                    }
                    if (user?.address) return user.address
                    return "Hosur, Tamil Nadu, India"
                  })()}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-auto" />
              </button>

              {/* Cart Icon with Numeric Badge (UC Style) */}
              {modalCart && modalCart.length > 0 && (
                <button
                  type="button"
                  onClick={() => navigate(routes.booking_checkout, { state: { category: activeCategory, cart: modalCart } })}
                  className="relative p-2.5 rounded-xl border border-slate-200 hover:border-emerald-500 bg-slate-50 text-slate-700 hover:text-emerald-700 transition-all cursor-pointer shrink-0"
                  title="View Cart"
                >
                  <ShoppingCart size={18} />
                  <span className="absolute -top-1.5 -right-1.5 bg-emerald-600 text-white font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-xs">
                    {modalCart.reduce((sum, i) => sum + i.quantity, 0)}
                  </span>
                </button>
              )}

              {/* User Profile / Login (Urban Company Style) */}
              {user ? (
                <div className="flex items-center gap-3">
                  {user.companyId && user.role !== "customer" && (
                    <button
                      type="button"
                      onClick={() => navigate(routes.dashboard)}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-xs transition-colors cursor-pointer"
                    >
                      Dashboard
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveAccountTab("My Profile")
                      setShowAccountPortal(true)
                    }}
                    className="flex items-center gap-2.5 text-slate-800 hover:text-slate-950 font-medium text-sm transition-colors cursor-pointer group"
                  >
                    <div className="w-7 h-7 rounded-full border border-slate-400 text-slate-700 flex items-center justify-center shrink-0 group-hover:border-slate-700 transition-colors">
                      <User className="w-4 h-4 stroke-[1.75]" />
                    </div>
                    <span className="font-semibold text-slate-800">
                      Hi, {user?.full_name || user?.fullName || user?.first_name || user?.firstName || user?.username || "Customer"} 👋
                    </span>
                    <ChevronDown className="w-4 h-4 text-slate-600 stroke-[2] shrink-0 group-hover:text-slate-900 transition-colors" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => navigate(routes.login)}
                    className="text-xs font-bold text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer"
                  >
                    Staff Login
                  </button>
                  <button
                    type="button"
                    onClick={goToLogin}
                    className="flex items-center gap-2 text-slate-800 hover:text-slate-950 font-medium text-sm transition-colors cursor-pointer group"
                  >
                    <div className="w-7 h-7 rounded-full border border-slate-400 text-slate-700 flex items-center justify-center shrink-0 group-hover:border-slate-700 transition-colors">
                      <User className="w-4 h-4 stroke-[1.75]" />
                    </div>
                    <span className="font-semibold text-slate-800">Login / Sign Up</span>
                    <ChevronDown className="w-4 h-4 text-slate-600 stroke-[2] shrink-0 group-hover:text-slate-900 transition-colors" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ── Hero ───────────────────────────────────────────── */}
        <section id="home" className="max-w-7xl mx-auto px-6 pt-14 pb-16 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-sm font-medium text-teal-600 mb-4">
              {homeConfig.hero?.badge || "Reliable. Affordable. Right at Your Doorstep."}
            </p>
            <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight text-slate-900 mb-5">
              {homeConfig.hero?.mainHeadingFirst || "Professional"}<br />
              <span className="text-teal-600">{homeConfig.hero?.mainHeadingHighlight || "Services"}</span><br />
              {homeConfig.hero?.mainHeadingLast || "Made Simple"}
            </h1>
            <p className="text-slate-500 text-base mb-8 max-w-md">
              {homeConfig.hero?.subtitle || "Quick booking. Quality work. Guaranteed satisfaction."}
            </p>

            <form
              onSubmit={(e) => { e.preventDefault(); goToBooking() }}
              className="flex items-center bg-white rounded-2xl shadow-sm border border-slate-200 p-1.5 mb-6 max-w-xl"
            >
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={homeConfig.hero?.searchPlaceholder || "What service do you need?"}
                className="flex-1 bg-transparent px-4 py-2.5 text-sm outline-none placeholder:text-slate-400"
              />
              <LocationDropdown className="hidden sm:flex border-0 border-l border-slate-200 rounded-none pl-3" />
              <button
                type="submit"
                aria-label="Search services"
                className="ml-1 bg-teal-600 hover:bg-teal-700 text-white rounded-xl w-11 h-11 flex items-center justify-center shrink-0 transition-colors"
              >
                <Search className="w-4.5 h-4.5" />
              </button>
            </form>

            <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs font-medium text-slate-500">
              {(homeConfig.hero?.quickBadges || []).map((badge, idx) => (
                <span key={badge.id || idx} className="inline-flex items-center gap-1.5">
                  {idx === 0 && <ShieldCheck className="w-4 h-4 text-teal-600" />}
                  {idx === 1 && <Star className="w-4 h-4 text-amber-500" />}
                  {idx === 2 && <Award className="w-4 h-4 text-rose-500" />}
                  {idx === 3 && <Clock className="w-4 h-4 text-violet-500" />}
                  {badge.text}
                </span>
              ))}
            </div>
          </div>

          {/* Real photo collage */}
          <div className="relative h-[420px] hidden sm:block">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-100 via-violet-50 to-orange-50 rounded-[3rem] -z-10" />
            <img
              src={homeConfig.hero?.collageImages_url?.[0] || homeConfig.hero?.collageImages?.[0] || "/assets/generic_image_placeholder.svg"}
              onError={(e) => { e.currentTarget.src = "/assets/generic_image_placeholder.svg" }}
              alt="Service photo 1"
              className="absolute top-0 left-0 w-[62%] h-[65%] object-cover rounded-3xl shadow-lg border-4 border-white"
            />
            <img
              src={homeConfig.hero?.collageImages_url?.[1] || homeConfig.hero?.collageImages?.[1] || "/assets/generic_image_placeholder.svg"}
              onError={(e) => { e.currentTarget.src = "/assets/generic_image_placeholder.svg" }}
              alt="Service photo 2"
              className="absolute bottom-0 left-[8%] w-[48%] h-[45%] object-cover rounded-3xl shadow-lg border-4 border-white"
            />
            <img
              src={homeConfig.hero?.collageImages_url?.[2] || homeConfig.hero?.collageImages?.[2] || "/assets/generic_image_placeholder.svg"}
              onError={(e) => { e.currentTarget.src = "/assets/generic_image_placeholder.svg" }}
              alt="Service photo 3"
              className="absolute top-[8%] right-0 w-[46%] h-[52%] object-cover rounded-3xl shadow-lg border-4 border-white"
            />
            <img
              src={homeConfig.hero?.collageImages_url?.[3] || homeConfig.hero?.collageImages?.[3] || "/assets/generic_image_placeholder.svg"}
              onError={(e) => { e.currentTarget.src = "/assets/generic_image_placeholder.svg" }}
              alt="Service photo 4"
              className="absolute bottom-[4%] right-[2%] w-[42%] h-[42%] object-cover rounded-3xl shadow-lg border-4 border-white"
            />
          </div>
        </section>

        {/* ── Browse by Category ─────────────────────────────── */}
        <section id="categories" className="max-w-7xl mx-auto px-6 py-10">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900">Browse by Category</h2>
          </div>

          {/* Dynamic Category Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl">
            {(homeConfig.categories || []).filter(c => c.enabled !== false && c.is_enabled !== false).map((cat, idx) => {
              const displayImg = cat.image_url || cat.image || "/assets/generic_image_placeholder.svg"
              return (
                <button
                  key={cat.id || idx}
                  type="button"
                  onClick={() => {
                    if (idx === 0) setIsForYouModalOpen(true)
                    else if (idx === 1) { setSelectedFoodSubModuleId(null); setIsFoodHealthModalOpen(true) }
                    else setIsHomeServicesCombinedModalOpen(true)
                  }}
                  className="group flex flex-col bg-white rounded-2xl border border-slate-100 hover:border-emerald-500 overflow-hidden text-center hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer"
                >
                  <div className="h-28 w-full overflow-hidden bg-slate-100 relative flex items-center justify-center">
                    <img
                      src={displayImg}
                      onError={(e) => { e.currentTarget.src = "/assets/generic_image_placeholder.svg" }}
                      alt={cat.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {cat.badge && (
                      <span className="absolute top-2 left-2 bg-emerald-600/90 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                        {cat.badge}
                      </span>
                    )}
                  </div>
                  <div className="p-3">
                    <span className="text-xs sm:text-sm font-bold text-slate-800 group-hover:text-emerald-700 transition-colors block truncate">
                      {cat.title}
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium mt-0.5 block truncate">
                      {cat.subtitle}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        {/* ── Home Services & Pest Control Modal Popup (Mounted to body for true window centering & Landing Page Emerald UI) ── */}
        {isHomePestModalOpen &&
          typeof document !== "undefined" &&
          createPortal(
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="homepest-modal-title"
              className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity"
              onClick={() => setIsHomePestModalOpen(false)}
            >
              <div
                className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl border border-slate-100 relative max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setIsHomePestModalOpen(false)}
                  aria-label="Close popup"
                  className="absolute -top-3 -right-3 w-7 h-7 rounded-full bg-white text-slate-900 hover:bg-slate-100 flex items-center justify-center shadow-md border border-slate-200 transition-colors z-50"
                >
                  <X className="w-4 h-4" strokeWidth={2.5} />
                </button>

                {/* Modal Title */}
                <div className="text-left mb-6">
                  <h3
                    id="homepest-modal-title"
                    className="text-lg sm:text-xl font-extrabold text-slate-900"
                  >
                    Cleaning &amp; Pest Control
                  </h3>
                </div>

                {/* Cleaning Section */}
                <div className="mb-6">
                  <h4 className="text-sm font-extrabold text-slate-900 mb-3 select-none">
                    Cleaning
                  </h4>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-x-2 gap-y-4 justify-items-center">
                    {HOME_SERVICES_SUB.map((item) => (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() => {
                          setIsHomePestModalOpen(false)
                          document.body.style.overflow = "unset"
                          if (item.name === "Kitchen Cleaning") {
                            navigate(`?category=kitchen_cleaning`)
                          } else if (item.name === "Sofa Cleaning") {
                            navigate(`?category=sofa_cleaning`)
                          } else if (item.name === "Bathroom Cleaning") {
                            navigate(`?category=bathroom_cleaning`)
                          } else if (item.name === "Full House Cleaning" || item.name === "Full House Deep Cleaning") {
                            navigate(`?category=cleaning&subtab=Occupied%20Apartment`)
                          } else {
                            navigate(`?category=${item.categoryId}&subtab=${encodeURIComponent(item.name)}`)
                          }
                        }}
                        className="group flex flex-col items-center focus:outline-none cursor-pointer w-full text-center"
                      >
                        <div className="relative w-[84px] h-[68px] sm:w-[98px] sm:h-[78px] rounded-xl bg-slate-100/60 group-hover:bg-emerald-50/50 group-hover:border-emerald-200 border border-transparent flex items-center justify-center transition-all">
                          <item.graphic className="w-12 h-12 sm:w-14 sm:h-14 group-hover:scale-105 transition-transform" />
                          {item.badge && (
                            <div className="absolute -bottom-1.5 bg-white border border-slate-200 text-slate-500 text-[8px] font-bold px-1 rounded shadow-sm scale-90 whitespace-nowrap">
                              {item.badge}
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] sm:text-[11px] font-semibold text-slate-700 mt-2.5 leading-tight group-hover:text-emerald-700 transition-colors max-w-[90px] sm:max-w-[105px] break-words">
                          {item.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Pest Control Section */}
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900 mb-3 select-none">
                    Pest Control
                  </h4>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-x-2 gap-y-4 justify-items-center">
                    {PEST_CONTROL_SUB.map((item) => (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() => {
                          setIsHomePestModalOpen(false)
                          document.body.style.overflow = "unset"
                          navigate(`?category=${item.categoryId}&subtab=${encodeURIComponent(item.name)}`)
                        }}
                        className="group flex flex-col items-center focus:outline-none cursor-pointer w-full text-center"
                      >
                        <div className="relative w-[84px] h-[68px] sm:w-[98px] sm:h-[78px] rounded-xl bg-slate-100/60 group-hover:bg-emerald-50/50 group-hover:border-emerald-200 border border-transparent flex items-center justify-center transition-all">
                          <item.graphic className="w-12 h-12 sm:w-14 sm:h-14 group-hover:scale-105 transition-transform" />
                          {item.badge && (
                            <div className="absolute -bottom-1.5 bg-white border border-slate-200 text-slate-500 text-[8px] font-bold px-1 rounded shadow-sm scale-90 whitespace-nowrap">
                              {item.badge}
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] sm:text-[11px] font-semibold text-slate-700 mt-2.5 leading-tight group-hover:text-emerald-700 transition-colors max-w-[90px] sm:max-w-[105px] break-words">
                          {item.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )}

        {/* ── Goods & Transports Modal Popup (Mounted to body for true window centering & Landing Page Emerald UI) ── */}
        {isGoodsModalOpen &&
          typeof document !== "undefined" &&
          createPortal(
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="transport-modal-title"
              className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity"
              onClick={() => setIsGoodsModalOpen(false)}
            >
              <div
                className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl border border-slate-100 relative max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setIsGoodsModalOpen(false)}
                  aria-label="Close popup"
                  className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 hover:bg-emerald-50 text-slate-500 hover:text-emerald-700 flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Modal Title */}
                <div className="text-center mb-6">
                  <h3
                    id="transport-modal-title"
                    className="text-lg sm:text-xl font-extrabold text-slate-900"
                  >
                    Goods &amp; Transports
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Choose a transport type to get an instant estimate
                  </p>
                </div>

                {/* Items Grid matching Image 2 with Landing Page Emerald styling */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 items-stretch">
                  {/* Option 1: Truck */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsGoodsModalOpen(false)
                      document.body.style.overflow = "unset"
                      navigate(routes.truck_booking_hosur)
                    }}
                    className="group flex flex-col items-center justify-between p-2.5 sm:p-3 rounded-2xl transition-all text-center focus:outline-none cursor-pointer border-2 border-transparent hover:border-slate-300 hover:bg-slate-50/80 hover:shadow-md"
                  >
                    <div className="w-full aspect-square max-w-[110px] rounded-2xl bg-slate-100/80 border border-slate-200/60 group-hover:bg-slate-200/80 flex items-center justify-center p-2 group-hover:scale-105 transition-all">
                      <TruckGraphic className="w-full h-full" />
                    </div>
                    <span className="text-sm font-bold text-slate-800 mt-2.5 group-hover:text-slate-900 transition-colors">
                      Mini Truck (Hosur)
                    </span>
                  </button>

                  {/* Option 2: Two Wheeler */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsGoodsModalOpen(false)
                      document.body.style.overflow = "unset"
                      navigate(routes.two_wheeler_booking_hosur)
                    }}
                    className="group flex flex-col items-center justify-between p-2.5 sm:p-3 rounded-2xl transition-all text-center focus:outline-none cursor-pointer border-2 border-transparent hover:border-slate-300 hover:bg-slate-50/80 hover:shadow-md"
                  >
                    <div className="w-full aspect-square max-w-[110px] rounded-2xl bg-slate-100/80 border border-slate-200/60 group-hover:bg-slate-200/80 flex items-center justify-center p-2 group-hover:scale-105 transition-all">
                      <TwoWheelerGraphic className="w-full h-full" />
                    </div>
                    <span className="text-sm font-bold text-slate-800 mt-2.5 group-hover:text-slate-900 transition-colors">
                      2-Wheeler (Hosur)
                    </span>
                  </button>

                  {/* Option 3: Packers & Movers */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsGoodsModalOpen(false)
                      document.body.style.overflow = "unset"
                      navigate(routes.packers_movers_booking_hosur)
                    }}
                    className="group flex flex-col items-center justify-between p-2.5 sm:p-3 rounded-2xl transition-all text-center focus:outline-none cursor-pointer border-2 border-transparent hover:border-slate-300 hover:bg-slate-50/80 hover:shadow-md"
                  >
                    <div className="w-full aspect-square max-w-[110px] rounded-2xl bg-slate-100/80 border border-slate-200/60 group-hover:bg-slate-200/80 flex items-center justify-center p-2 group-hover:scale-105 transition-all">
                      <PackersMoversGraphic className="w-full h-full" />
                    </div>
                    <span className="text-sm font-bold text-slate-800 mt-2.5 group-hover:text-slate-900 transition-colors">
                      Packers &amp; Movers
                    </span>
                  </button>

                  {/* Option 4: All Transports */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsGoodsModalOpen(false)
                      document.body.style.overflow = "unset"
                      navigate(routes.truck_booking_hosur)
                    }}
                    className="group flex flex-col items-center justify-between p-2.5 sm:p-3 rounded-2xl transition-all text-center focus:outline-none cursor-pointer border-2 border-transparent hover:border-slate-300 hover:bg-slate-50/80 hover:shadow-md"
                  >
                    <div className="w-full aspect-square max-w-[110px] rounded-2xl bg-[#059669] border border-emerald-600 group-hover:bg-emerald-700 flex items-center justify-center p-2 group-hover:scale-105 transition-all text-white font-bold text-xs">
                      View All
                    </div>
                    <span className="text-sm font-bold text-slate-800 mt-2.5 group-hover:text-slate-900 transition-colors">
                      All Options
                    </span>
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )}

        {/* ── Electrician, Plumbing & Carpentry Sub-Category Modal Popup ── */}
        {isElecModalOpen &&
          typeof document !== "undefined" &&
          createPortal(
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="elec-modal-title"
              className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity"
              onClick={() => setIsElecModalOpen(false)}
            >
              <div
                className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl border border-slate-100 relative max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setIsElecModalOpen(false)}
                  aria-label="Close popup"
                  className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 hover:bg-emerald-50 text-slate-500 hover:text-emerald-700 flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Modal Title */}
                <div className="text-center mb-6">
                  <h3
                    id="elec-modal-title"
                    className="text-lg sm:text-xl font-extrabold text-slate-900"
                  >
                    Electrician, Plumbing &amp; Carpentry
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Choose a service type to view related services
                  </p>
                </div>

                {/* Items Grid for Electrician, Plumbing & Carpentry (3 options) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 items-stretch">
                  {/* Option 1: Electrician */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsElecModalOpen(false)
                      document.body.style.overflow = "unset"
                      goToCategoryServices("electrical")
                    }}
                    className="group flex flex-col items-center justify-between p-2.5 sm:p-3 rounded-2xl transition-all text-center focus:outline-none cursor-pointer border-2 border-transparent hover:border-slate-300 hover:bg-slate-50/80 hover:shadow-md"
                  >
                    <div className="w-full aspect-square max-w-[110px] rounded-2xl bg-slate-100/80 border border-slate-200/60 group-hover:bg-slate-200/80 flex items-center justify-center p-2 group-hover:scale-105 transition-all">
                      <ElectricianGraphic className="w-full h-full" />
                    </div>
                    <span className="text-sm font-bold text-slate-800 mt-2.5 group-hover:text-slate-900 transition-colors">
                      Electrician
                    </span>
                  </button>

                  {/* Option 2: Plumber */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsElecModalOpen(false)
                      document.body.style.overflow = "unset"
                      goToCategoryServices("plumbing")
                    }}
                    className="group flex flex-col items-center justify-between p-2.5 sm:p-3 rounded-2xl transition-all text-center focus:outline-none cursor-pointer border-2 border-transparent hover:border-slate-300 hover:bg-slate-50/80 hover:shadow-md"
                  >
                    <div className="w-full aspect-square max-w-[110px] rounded-2xl bg-slate-100/80 border border-slate-200/60 group-hover:bg-slate-200/80 flex items-center justify-center p-2 group-hover:scale-105 transition-all">
                      <PlumberGraphic className="w-full h-full" />
                    </div>
                    <span className="text-sm font-bold text-slate-800 mt-2.5 group-hover:text-slate-900 transition-colors">
                      Plumber
                    </span>
                  </button>

                  {/* Option 3: Carpentry */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsElecModalOpen(false)
                      document.body.style.overflow = "unset"
                      goToCategoryServices("carpentry")
                    }}
                    className="group flex flex-col items-center justify-between p-2.5 sm:p-3 rounded-2xl transition-all text-center focus:outline-none cursor-pointer border-2 border-transparent hover:border-slate-300 hover:bg-slate-50/80 hover:shadow-md"
                  >
                    <div className="w-full aspect-square max-w-[110px] rounded-2xl bg-slate-100/80 border border-slate-200/60 group-hover:bg-slate-200/80 flex items-center justify-center p-2 group-hover:scale-105 transition-all">
                      <CarpentryGraphic className="w-full h-full" />
                    </div>
                    <span className="text-sm font-bold text-slate-800 mt-2.5 group-hover:text-slate-900 transition-colors">
                      Carpentry
                    </span>
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )}

        {/* ── AC & Appliance Sub-Category Modal Popup ── */}
        {isAcModalOpen &&
          typeof document !== "undefined" &&
          createPortal(
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="ac-modal-title"
              className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity"
              onClick={() => setIsAcModalOpen(false)}
            >
              <div
                className="bg-white rounded-3xl p-6 sm:p-8 max-w-3xl w-full shadow-2xl border border-slate-100 relative max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setIsAcModalOpen(false)}
                  aria-label="Close popup"
                  className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Modal Title */}
                <div className="text-center mb-6">
                  <h3
                    id="ac-modal-title"
                    className="text-lg sm:text-xl font-extrabold text-slate-900"
                  >
                    AC &amp; Appliance Repair
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Choose an appliance type to view related services
                  </p>
                </div>

                {/* Items Grid for AC & Appliance Repair (5 options) */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4 items-stretch">
                  {/* Option 1: AC Service */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsAcModalOpen(false)
                      document.body.style.overflow = "unset"
                      goToCategoryServices("hvac", "AC Service & Cleaning")
                    }}
                    className="group flex flex-col items-center justify-between p-2.5 sm:p-3 rounded-2xl transition-all text-center focus:outline-none cursor-pointer border-2 border-transparent hover:border-slate-300 hover:bg-slate-50/80 hover:shadow-md"
                  >
                    <div className="w-full aspect-square max-w-[110px] rounded-2xl bg-slate-100/80 border border-slate-200/60 group-hover:bg-slate-200/80 flex items-center justify-center p-2 group-hover:scale-105 transition-all">
                      <AcGraphic className="w-full h-full" />
                    </div>
                    <span className="text-sm font-bold text-slate-800 mt-2.5 group-hover:text-slate-900 transition-colors">
                      Air Conditioner
                    </span>
                  </button>

                  {/* Option 2: Refrigerator */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsAcModalOpen(false)
                      document.body.style.overflow = "unset"
                      goToCategoryServices("refrigerator", "Refrigerator Service & Repair")
                    }}
                    className="group flex flex-col items-center justify-between p-2.5 sm:p-3 rounded-2xl transition-all text-center focus:outline-none cursor-pointer border-2 border-transparent hover:border-slate-300 hover:bg-slate-50/80 hover:shadow-md"
                  >
                    <div className="w-full aspect-square max-w-[110px] rounded-2xl bg-slate-100/80 border border-slate-200/60 group-hover:bg-slate-200/80 flex items-center justify-center p-2 group-hover:scale-105 transition-all">
                      <FridgeGraphic className="w-full h-full" />
                    </div>
                    <span className="text-sm font-bold text-slate-800 mt-2.5 group-hover:text-slate-900 transition-colors">
                      Refrigerator
                    </span>
                  </button>

                  {/* Option 3: Washing Machine */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsAcModalOpen(false)
                      document.body.style.overflow = "unset"
                      goToCategoryServices("washing_machine", "Washing Machine Jet Service")
                    }}
                    className="group flex flex-col items-center justify-between p-2.5 sm:p-3 rounded-2xl transition-all text-center focus:outline-none cursor-pointer border-2 border-transparent hover:border-slate-300 hover:bg-slate-50/80 hover:shadow-md"
                  >
                    <div className="w-full aspect-square max-w-[110px] rounded-2xl bg-slate-100/80 border border-slate-200/60 group-hover:bg-slate-200/80 flex items-center justify-center p-2 group-hover:scale-105 transition-all">
                      <WashingMachineGraphic className="w-full h-full" />
                    </div>
                    <span className="text-sm font-bold text-slate-800 mt-2.5 group-hover:text-slate-900 transition-colors">
                      Washing Machine
                    </span>
                  </button>

                  {/* Option 4: TV & Home Theatre */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsAcModalOpen(false)
                      document.body.style.overflow = "unset"
                      goToCategoryServices("tv_display", "TV Service & Repair")
                    }}
                    className="group flex flex-col items-center justify-between p-2.5 sm:p-3 rounded-2xl transition-all text-center focus:outline-none cursor-pointer border-2 border-transparent hover:border-slate-300 hover:bg-slate-50/80 hover:shadow-md"
                  >
                    <div className="w-full aspect-square max-w-[110px] rounded-2xl bg-slate-100/80 border border-slate-200/60 group-hover:bg-slate-200/80 flex items-center justify-center p-2 group-hover:scale-105 transition-all">
                      <TvGraphic className="w-full h-full" />
                    </div>
                    <span className="text-sm font-bold text-slate-800 mt-2.5 group-hover:text-slate-900 transition-colors">
                      TV &amp; Display
                    </span>
                  </button>

                  {/* Option 5: Microwave Oven */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsAcModalOpen(false)
                      document.body.style.overflow = "unset"
                      goToCategoryServices("microwave", "Microwave Repair")
                    }}
                    className="group flex flex-col items-center justify-between p-2.5 sm:p-3 rounded-2xl transition-all text-center focus:outline-none cursor-pointer border-2 border-transparent hover:border-slate-300 hover:bg-slate-50/80 hover:shadow-md"
                  >
                    <div className="w-full aspect-square max-w-[110px] rounded-2xl bg-slate-100/80 border border-slate-200/60 group-hover:bg-slate-200/80 flex items-center justify-center p-2 group-hover:scale-105 transition-all">
                      <MicrowaveGraphic className="w-full h-full" />
                    </div>
                    <span className="text-sm font-bold text-slate-800 mt-2.5 group-hover:text-slate-900 transition-colors">
                      Microwave Oven
                    </span>
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )}

        {/* ── Trust strip ────────────────────────────────────── */}
        <section className="max-w-7xl mx-auto px-6">
          <div className="bg-slate-50 border border-slate-200 rounded-3xl grid sm:grid-cols-2 lg:grid-cols-5 gap-6 p-8">
            {(homeConfig.trustBadges || []).filter(b => b.enabled !== false).map((badge, idx) => {
              const iconColors = ["text-teal-600", "text-rose-500", "text-violet-600", "text-amber-500", "text-sky-500"]
              return (
                <div key={badge.id || idx} className="flex flex-col items-start gap-2">
                  <ShieldCheck className={`w-6 h-6 ${iconColors[idx % iconColors.length]}`} strokeWidth={1.75} />
                  <p className="text-sm font-bold text-slate-800 leading-snug">{badge.title}</p>
                  <p className="text-xs text-slate-500 leading-relaxed">{badge.description}</p>
                </div>
              )
            })}
          </div>
        </section>

        {/* ── Offers ─────────────────────────────────────────── */}
        <section className="max-w-7xl mx-auto px-6 py-14 grid lg:grid-cols-[220px_1fr] gap-6 items-stretch">
          <div className="bg-gradient-to-br from-teal-600 to-emerald-700 rounded-3xl p-6 flex flex-col justify-center">
            <p className="text-lg font-extrabold text-white mb-1">{homeConfig.offers?.mainCard?.title || "Limited Time Offers!"}</p>
            <p className="text-xs text-teal-100 mb-4">{homeConfig.offers?.mainCard?.subtitle || "Great deals on services you love."}</p>
            <button onClick={goToBooking} className="bg-white text-teal-700 hover:bg-teal-50 text-xs font-bold px-4 py-2 rounded-full self-start transition-colors">
              {homeConfig.offers?.mainCard?.buttonText || "Explore Offers"}
            </button>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            {(homeConfig.offers?.items || []).filter(o => o.enabled !== false).map((offer, idx) => {
              const bgStyles = [
                "bg-amber-50 hover:bg-amber-100 text-amber-900",
                "bg-rose-50 hover:bg-rose-100 text-rose-900",
                "bg-violet-50 hover:bg-violet-100 text-violet-900"
              ]
              const tagColors = ["text-amber-600", "text-rose-600", "text-violet-600"]
              const linkColors = ["text-amber-700", "text-rose-700", "text-violet-700"]
              const currentBg = bgStyles[idx % bgStyles.length]
              const currentTag = tagColors[idx % tagColors.length]
              const currentLink = linkColors[idx % linkColors.length]
              return (
                <button
                  key={offer.id || idx}
                  onClick={goToBooking}
                  className={`${currentBg} rounded-3xl p-6 text-left hover:shadow-md transition-all border border-slate-100`}
                >
                  <p className={`text-[11px] font-bold tracking-wide ${currentTag}`}>{offer.tag}</p>
                  <p className="text-2xl font-extrabold text-slate-900 mb-1">{offer.discount}</p>
                  <p className="text-sm text-slate-600 mb-4">{offer.title}</p>
                  <span className={`text-xs font-semibold ${currentLink}`}>{offer.cta || "Book Now →"}</span>
                </button>
              )
            })}
          </div>
        </section>

        {/* ── How It Works ───────────────────────────────────── */}
        <section id="how-it-works" className="max-w-7xl mx-auto px-6 py-10">
          <h2 className="text-xl font-bold text-slate-900 text-center mb-10">{homeConfig.howItWorks?.heading || "How It Works"}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-8">
            {(homeConfig.howItWorks?.steps || []).map((step, i) => {
              const stepColors = [
                { bg: "bg-teal-50", icon: "text-teal-600", badge: "bg-teal-600" },
                { bg: "bg-rose-50", icon: "text-rose-500", badge: "bg-rose-500" },
                { bg: "bg-violet-50", icon: "text-violet-600", badge: "bg-violet-600" },
                { bg: "bg-amber-50", icon: "text-amber-500", badge: "bg-amber-500" },
                { bg: "bg-sky-50", icon: "text-sky-500", badge: "bg-sky-500" },
              ]
              const c = stepColors[i % stepColors.length]
              return (
                <div key={step.num || i} className="flex flex-col items-center text-center gap-3">
                  <div className="relative">
                    <div className={`w-16 h-16 rounded-full ${c.bg} flex items-center justify-center`}>
                      <Repeat2 className={`w-7 h-7 ${c.icon}`} strokeWidth={1.75} />
                    </div>
                    <span className={`absolute -top-1 -left-1 w-5 h-5 rounded-full ${c.badge} text-white text-[10px] font-bold flex items-center justify-center`}>
                      {step.num || i + 1}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-slate-800">{step.title}</p>
                  <p className="text-xs text-slate-500 leading-relaxed">{step.description}</p>
                </div>
              )
            })}
          </div>
        </section>

        {/* ── Stats ──────────────────────────────────────────── */}
        <section className="bg-slate-800 py-10">
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 sm:grid-cols-5 gap-6 text-center text-white">
            {(homeConfig.statsBar || []).map((s, idx) => (
              <div key={s.id || idx}>
                <p className="text-2xl font-extrabold text-amber-400">{s.number}</p>
                <p className="text-xs text-slate-300 font-medium">{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Featured Professionals ─────────────────────────── */}
        <section id="professionals" className="max-w-7xl mx-auto px-6 py-14">
          <h2 className="text-xl font-bold text-slate-900 text-center mb-2">{homeConfig.featuredPros?.title || "Featured Professionals"}</h2>
          <p className="text-sm text-slate-500 text-center mb-10">{homeConfig.featuredPros?.subtitle || "Top-rated experts ready to help"}</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            {(homeConfig.featuredPros?.pros || []).map((p, idx) => (
              <div key={p.id || idx} className="bg-white rounded-2xl border border-slate-100 overflow-hidden hover:shadow-md transition-shadow">
                <img
                  src={p.image_url || p.image || "/assets/generic_avatar_placeholder.svg"}
                  onError={(e) => { e.currentTarget.src = "/assets/generic_avatar_placeholder.svg" }}
                  alt={p.name}
                  className="w-full h-36 object-cover"
                />
                <div className="p-4">
                  <p className="text-sm font-bold text-slate-800">{p.name}</p>
                  <p className="text-xs text-slate-500 mb-2">{p.title}</p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="inline-flex items-center gap-1 font-semibold text-amber-500">
                      <Star className="w-3.5 h-3.5 fill-current" /> {p.rating}
                    </span>
                    <span className="text-slate-400 font-medium">{p.jobs} jobs</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Testimonials ───────────────────────────────────── */}
        <section className="max-w-7xl mx-auto px-6 py-14 bg-slate-50 rounded-3xl">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold text-slate-900 mx-auto sm:mx-0">{homeConfig.testimonials?.title || "What Our Customers Say"}</h2>
            <a href="#" className="hidden sm:inline text-sm font-semibold text-teal-600 hover:text-teal-700 whitespace-nowrap">{homeConfig.testimonials?.viewAllText || "View all reviews →"}</a>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setTestimonialIdx((i) => (i - 1 + (homeConfig.testimonials?.reviews?.length || 1)) % (homeConfig.testimonials?.reviews?.length || 1))}
              className="hidden sm:flex w-9 h-9 rounded-full border border-slate-200 items-center justify-center text-slate-400 hover:text-slate-700 shrink-0 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="grid sm:grid-cols-3 gap-5 flex-1">
              {(homeConfig.testimonials?.reviews || []).map((t, i) => (
                <div key={t.id || i} className={`bg-white rounded-2xl border border-slate-100 p-5 ${i === testimonialIdx ? "ring-2 ring-teal-300 shadow-md" : ""}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-8 h-8 rounded-full bg-teal-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                      {t.initials}
                    </span>
                    <div className="flex gap-0.5 text-amber-400">
                      {Array.from({ length: t.rating || 5 }).map((_, j) => <Star key={j} className="w-3.5 h-3.5 fill-current" />)}
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 mb-3 leading-relaxed">{t.text}</p>
                  <p className="text-sm font-bold text-slate-800">&mdash; {t.name}</p>
                </div>
              ))}
            </div>
            <button
              onClick={() => setTestimonialIdx((i) => (i + 1) % TESTIMONIALS.length)}
              className="hidden sm:flex w-9 h-9 rounded-full border border-slate-200 items-center justify-center text-slate-400 hover:text-slate-700 shrink-0"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="flex justify-center gap-1.5 mt-6">
            {TESTIMONIALS.map((_, i) => (
              <span key={i} className={`w-1.5 h-1.5 rounded-full ${i === testimonialIdx ? "bg-teal-600" : "bg-slate-200"}`} />
            ))}
          </div>
        </section>

        {/* ── App download banner ────────────────────────────── */}
        <section className="max-w-7xl mx-auto px-6 pb-14">
          <div className="bg-gradient-to-r from-rose-500 to-amber-500 rounded-3xl px-8 py-7 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/25 flex items-center justify-center text-white shrink-0">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Book on the go!</p>
                <p className="text-lg font-extrabold text-white">Download the CalServices App</p>
                <p className="text-xs text-rose-100">Faster booking, real-time tracking &amp; exclusive app offers.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button className="bg-white text-rose-600 text-xs font-semibold px-4 py-2.5 rounded-xl hover:bg-rose-50 transition-colors">Get it on Google Play</button>
              <button className="bg-white text-rose-600 text-xs font-semibold px-4 py-2.5 rounded-xl hover:bg-rose-50 transition-colors">Download on App Store</button>
            </div>
          </div>
        </section>


      <BkStyles />
      {activeCategory && (
        (activeCategory.id === "kitchen_cleaning" || activeCategory.slug === "kitchen_cleaning" || String(activeCategory.id) === "kitchen_cleaning" || activeCategory.name?.toLowerCase()?.includes("kitchen")) ? (
          <KitchenCleaningModal
            category={activeCategory}
            cart={modalCart}
            setCart={setModalCart}
            onClose={() => navigate("/home")}
            onCheckout={(customCart) => navigate(routes.booking_checkout, { state: { category: activeCategory, cart: resolveCartArg(customCart) } })}
          />
        ) : (activeCategory.id === "sofa_cleaning" || activeCategory.slug === "sofa_cleaning" || String(activeCategory.id) === "sofa_cleaning" || activeCategory.name?.toLowerCase()?.includes("sofa")) ? (
          <SofaCleaningModal
            category={activeCategory}
            cart={modalCart}
            setCart={setModalCart}
            onClose={() => navigate("/home")}
            onCheckout={(customCart) => navigate(routes.booking_checkout, { state: { category: activeCategory, cart: resolveCartArg(customCart) } })}
          />
        ) : (activeCategory.id === "bathroom_cleaning" || activeCategory.slug === "bathroom_cleaning" || String(activeCategory.id) === "bathroom_cleaning" || activeCategory.name?.toLowerCase()?.includes("bathroom")) ? (
          <BathroomCleaningModal
            category={activeCategory}
            cart={modalCart}
            setCart={setModalCart}
            onClose={() => navigate("/home")}
            onCheckout={(customCart) => navigate(routes.booking_checkout, { state: { category: activeCategory, cart: resolveCartArg(customCart) } })}
          />
        ) : (activeCategory.id === "painting" || activeCategory.slug === "painting" || String(activeCategory.id) === "painting" || activeCategory.name?.toLowerCase() === "painting") ? (
          <PaintingPackageModal
            category={activeCategory}
            cart={modalCart}
            setCart={setModalCart}
            packagesData={packagesData}
            onClose={() => navigate("/home")}
            onCheckout={(customCart) => {
              const finalCart = resolveCartArg(customCart);
              setModalCart(cleanConsultationItems(finalCart));
              navigate(routes.booking_checkout, { state: { category: activeCategory, cart: finalCart } });
            }}
            onGetEstimate={(customCart) => {
              const finalCart = resolveCartArg(customCart);
              setModalCart(cleanConsultationItems(finalCart));
              navigate(routes.booking_checkout, { state: { category: activeCategory, cart: finalCart, triggerLocPicker: true } });
            }}
          />
        ) : (activeCategory.id === "mason" || activeCategory.slug === "mason" || String(activeCategory.id) === "mason" || activeCategory.name?.toLowerCase() === "mason") ? (
          <MasonPackageModal
            category={activeCategory}
            cart={modalCart}
            setCart={setModalCart}
            packagesData={packagesData}
            onClose={() => navigate("/home")}
            onCheckout={(customCart) => {
              const finalCart = resolveCartArg(customCart);
              setModalCart(cleanConsultationItems(finalCart));
              navigate(routes.booking_checkout, { state: { category: activeCategory, cart: finalCart } });
            }}
            onGetEstimate={(customCart) => {
              const finalCart = resolveCartArg(customCart);
              setModalCart(cleanConsultationItems(finalCart));
              navigate(routes.booking_checkout, { state: { category: activeCategory, cart: finalCart, triggerLocPicker: true } });
            }}
          />
        ) : (activeCategory.id === "pest_control" || activeCategory.slug === "pest_control" || activeSubTabParam === "Cockroach & Termite Control" || activeSubTabParam === "Cockroach Control" || activeSubTabParam === "Termite Control") && (activeSubTabParam !== "Ants & Bed Bugs Control" && activeSubTabParam !== "Ants Control" && activeSubTabParam !== "Bedbugs Control" && activeSubTabParam !== "Ants and bed bugs control") ? (
          <CockroachControlModal
            category={{ id: "pest_control", name: "Pest Control" }}
            cart={modalCart}
            setCart={setModalCart}
            initialTab={activeSubTabParam === "Termite Control" ? "termite" : "cockroach"}
            onClose={() => navigate("/home")}
            onCheckout={(customCart) => {
              const finalCart = resolveCartArg(customCart);
              setModalCart(finalCart);
              navigate(routes.booking_checkout, { state: { category: activeCategory, cart: finalCart } });
            }}
          />
        ) : (activeCategory.id === "pest_control" || activeCategory.slug === "pest_control" || activeSubTabParam === "Ants & Bed Bugs Control" || activeSubTabParam === "Ants Control" || activeSubTabParam === "Bedbugs Control" || activeSubTabParam === "Ants and bed bugs control") ? (
          <AntsBedBugsControlModal
            category={{ id: "pest_control", name: "Pest Control" }}
            cart={modalCart}
            setCart={setModalCart}
            initialTab={activeSubTabParam === "Ants Control" ? "ants" : "bedbugs"}
            onClose={() => navigate("/home")}
            onCheckout={(customCart) => {
              const finalCart = resolveCartArg(customCart);
              setModalCart(finalCart);
              navigate(routes.booking_checkout, { state: { category: activeCategory, cart: finalCart } });
            }}
          />
        ) : (

          <CustomCleaningPackageModal
            category={activeCategory}
            cart={modalCart}
            setCart={setModalCart}
            onClose={() => navigate("/home")}
            onCheckout={(customCart) => {
              const finalCart = resolveCartArg(customCart);
              setModalCart(cleanConsultationItems(finalCart));
              navigate(routes.booking_checkout, { state: { category: activeCategory, cart: finalCart } });
            }}
          />
        )
      )}

      {/* ── Home Services & Pest Control Modal Popup (Mounted to body for true window centering & Landing Page Emerald UI) ── */}
      {isHomePestModalOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="homepest-modal-title"
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsHomePestModalOpen(false)}
          >
            <div
              className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl border border-slate-100 relative max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setIsHomePestModalOpen(false)}
                aria-label="Close popup"
                className="absolute -top-3 -right-3 w-7 h-7 rounded-full bg-white text-slate-900 hover:bg-slate-100 flex items-center justify-center shadow-md border border-slate-200 transition-colors z-50"
              >
                <X className="w-4 h-4" strokeWidth={2.5} />
              </button>

              {/* Modal Title */}
              <div className="text-left mb-6">
                <h3
                  id="homepest-modal-title"
                  className="text-lg sm:text-xl font-extrabold text-slate-900"
                >
                  Cleaning &amp; Pest Control
                </h3>
              </div>

              {/* Cleaning Section */}
              <div className="mb-6">
                <h4 className="text-sm font-extrabold text-slate-900 mb-3 select-none">
                  Cleaning
                </h4>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-x-2 gap-y-4 justify-items-center">
                  {HOME_SERVICES_SUB.map((item) => (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => {
                        setIsHomePestModalOpen(false)
                        document.body.style.overflow = "unset"
                        if (item.name === "Kitchen Cleaning") {
                          navigate(`?category=kitchen_cleaning`)
                        } else if (item.name === "Sofa Cleaning") {
                          navigate(`?category=sofa_cleaning`)
                        } else if (item.name === "Bathroom Cleaning") {
                          navigate(`?category=bathroom_cleaning`)
                        } else if (item.name === "Full House Cleaning" || item.name === "Full House Deep Cleaning") {
                          navigate(`?category=cleaning&subtab=Occupied%20Apartment`)
                        } else {
                          navigate(`?category=${item.categoryId}&subtab=${encodeURIComponent(item.name)}`)
                        }
                      }}
                      className="group flex flex-col items-center focus:outline-none cursor-pointer w-full text-center"
                    >
                      <div className="relative w-[84px] h-[68px] sm:w-[98px] sm:h-[78px] rounded-xl bg-slate-100/60 group-hover:bg-emerald-50/50 group-hover:border-emerald-200 border border-transparent flex items-center justify-center transition-all">
                        <item.graphic className="w-12 h-12 sm:w-14 sm:h-14 group-hover:scale-105 transition-transform" />
                        {item.badge && (
                          <div className="absolute -bottom-1.5 bg-white border border-slate-200 text-slate-500 text-[8px] font-bold px-1 rounded shadow-sm scale-90 whitespace-nowrap">
                            {item.badge}
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] sm:text-[11px] font-semibold text-slate-700 mt-2.5 leading-tight group-hover:text-emerald-700 transition-colors max-w-[90px] sm:max-w-[105px] break-words">
                        {item.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Pest Control Section */}
              <div>
                <h4 className="text-sm font-extrabold text-slate-900 mb-3 select-none">
                  Pest Control
                </h4>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-x-2 gap-y-4 justify-items-center">
                  {PEST_CONTROL_SUB.map((item) => (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => {
                        setIsHomePestModalOpen(false)
                        document.body.style.overflow = "unset"
                        navigate(`?category=${item.categoryId}&subtab=${encodeURIComponent(item.name)}`)
                      }}
                      className="group flex flex-col items-center focus:outline-none cursor-pointer w-full text-center"
                    >
                      <div className="relative w-[84px] h-[68px] sm:w-[98px] sm:h-[78px] rounded-xl bg-slate-100/60 group-hover:bg-emerald-50/50 group-hover:border-emerald-200 border border-transparent flex items-center justify-center transition-all">
                        <item.graphic className="w-12 h-12 sm:w-14 sm:h-14 group-hover:scale-105 transition-transform" />
                        {item.badge && (
                          <div className="absolute -bottom-1.5 bg-white border border-slate-200 text-slate-500 text-[8px] font-bold px-1 rounded shadow-sm scale-90 whitespace-nowrap">
                            {item.badge}
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] sm:text-[11px] font-semibold text-slate-700 mt-2.5 leading-tight group-hover:text-emerald-700 transition-colors max-w-[90px] sm:max-w-[105px] break-words">
                        {item.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ── Goods & Transports Modal Popup (Mounted to body for true window centering & Landing Page Emerald UI) ── */}
      {isGoodsModalOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="transport-modal-title"
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsGoodsModalOpen(false)}
          >
            <div
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl border border-slate-100 relative max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setIsGoodsModalOpen(false)}
                aria-label="Close popup"
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 hover:bg-emerald-50 text-slate-500 hover:text-emerald-700 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Modal Title */}
              <div className="text-center mb-6">
                <h3
                  id="transport-modal-title"
                  className="text-lg sm:text-xl font-extrabold text-slate-900"
                >
                  Goods &amp; Transports
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Choose a transport type to get an instant estimate
                </p>
              </div>

              {/* Items Grid matching Image 2 with Landing Page Emerald styling */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 items-stretch">
                {/* Option 1: Truck */}
                <button
                  type="button"
                  onClick={() => {
                    setIsGoodsModalOpen(false)
                    document.body.style.overflow = "unset"
                    navigate(routes.truck_booking_hosur)
                  }}
                  className="group flex flex-col items-center justify-between p-2.5 sm:p-3 rounded-2xl transition-all text-center focus:outline-none cursor-pointer border-2 border-transparent hover:border-emerald-500 hover:bg-emerald-50/50 hover:shadow-md"
                >
                  <div className="w-full aspect-square max-w-[110px] rounded-2xl bg-slate-100 group-hover:bg-slate-200 flex items-center justify-center p-2 group-hover:scale-105 transition-all">
                    <TruckGraphic className="w-full h-full" />
                  </div>
                  <span className="text-sm font-bold text-slate-800 mt-2.5 group-hover:text-emerald-700 transition-colors">
                    Truck
                  </span>
                </button>

                {/* Option 2: Two Wheeler */}
                <button
                  type="button"
                  onClick={() => {
                    setIsGoodsModalOpen(false)
                    document.body.style.overflow = "unset"
                    navigate(routes.two_wheeler_booking_hosur)
                  }}
                  className="group flex flex-col items-center justify-between p-2.5 sm:p-3 rounded-2xl transition-all text-center focus:outline-none cursor-pointer border-2 border-transparent hover:border-emerald-500 hover:bg-emerald-50/50 hover:shadow-md"
                >
                  <div className="w-full aspect-square max-w-[110px] rounded-2xl bg-slate-100 group-hover:bg-slate-200 flex items-center justify-center p-2 group-hover:scale-105 transition-all">
                    <TwoWheelerGraphic className="w-full h-full" />
                  </div>
                  <span className="text-sm font-bold text-slate-800 mt-2.5 group-hover:text-emerald-700 transition-colors">
                    Two Wheeler
                  </span>
                </button>

                {/* Option 3: Packers & Movers */}
                <button
                  type="button"
                  onClick={() => {
                    setIsGoodsModalOpen(false)
                    document.body.style.overflow = "unset"
                    navigate(routes.packers_movers_booking_hosur)
                  }}
                  className="group flex flex-col items-center justify-between p-2.5 sm:p-3 rounded-2xl transition-all text-center focus:outline-none cursor-pointer border-2 border-transparent hover:border-emerald-500 hover:bg-emerald-50/50 hover:shadow-md"
                >
                  <div className="w-full aspect-square max-w-[110px] rounded-2xl bg-slate-100 group-hover:bg-slate-200 flex items-center justify-center p-2 group-hover:scale-105 transition-all">
                    <PackersMoversGraphic className="w-full h-full" />
                  </div>
                  <span className="text-sm font-bold text-slate-800 mt-2.5 group-hover:text-emerald-700 transition-colors">
                    Packers &amp; Movers
                  </span>
                </button>

                {/* Option 4: Get an Estimate card/button in Landing Page Emerald theme */}
                <button
                  type="button"
                  onClick={() => {
                    setIsGoodsModalOpen(false)
                    document.body.style.overflow = "unset"
                    navigate(routes.truck_booking_hosur)
                  }}
                  className="group flex flex-col justify-between p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 active:scale-[0.98] text-white shadow-lg shadow-emerald-600/25 transition-all text-left cursor-pointer min-h-[140px]"
                >
                  <div>
                    <p className="text-lg sm:text-xl font-extrabold leading-tight tracking-tight">
                      Get an<br />Estimate
                    </p>
                    <p className="text-xs text-emerald-100 font-medium mt-2 opacity-95">
                      (takes ~2 mins)
                    </p>
                  </div>
                  <div className="pt-4 flex items-center">
                    <ArrowRight className="w-6 h-6 text-white stroke-[2.5] group-hover:translate-x-1.5 transition-transform" />
                  </div>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ── Electrician, Plumbing & Carpentry Sub-Category Modal Popup ── */}
      {isElecModalOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="elec-modal-title"
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsElecModalOpen(false)}
          >
            <div
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl border border-slate-100 relative max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setIsElecModalOpen(false)}
                aria-label="Close popup"
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 hover:bg-emerald-50 text-slate-500 hover:text-emerald-700 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Modal Title */}
              <div className="text-center mb-6">
                <h3
                  id="elec-modal-title"
                  className="text-lg sm:text-xl font-extrabold text-slate-900"
                >
                  Electrician, Plumbing &amp; Carpentry
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Choose a service type to view related services
                </p>
              </div>

              {/* Items Grid for Electrician, Plumbing & Carpentry (3 options) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 items-stretch">
                {/* Option 1: Electrician */}
                <button
                  type="button"
                  onClick={() => {
                    setIsElecModalOpen(false)
                    document.body.style.overflow = "unset"
                    goToCategoryServices("electrical")
                  }}
                  className="group flex flex-col items-center justify-between p-2.5 sm:p-3 rounded-2xl transition-all text-center focus:outline-none cursor-pointer border-2 border-transparent hover:border-slate-300 hover:bg-slate-50/80 hover:shadow-md"
                >
                  <div className="w-full aspect-square max-w-[110px] rounded-2xl bg-slate-100/80 border border-slate-200/60 group-hover:bg-slate-200/80 flex items-center justify-center p-2 group-hover:scale-105 transition-all">
                    <ElectricianGraphic className="w-full h-full" />
                  </div>
                  <span className="text-sm font-bold text-slate-800 mt-2.5 group-hover:text-slate-900 transition-colors">
                    Electrician
                  </span>
                </button>

                {/* Option 2: Plumber */}
                <button
                  type="button"
                  onClick={() => {
                    setIsElecModalOpen(false)
                    document.body.style.overflow = "unset"
                    goToCategoryServices("plumbing")
                  }}
                  className="group flex flex-col items-center justify-between p-2.5 sm:p-3 rounded-2xl transition-all text-center focus:outline-none cursor-pointer border-2 border-transparent hover:border-slate-300 hover:bg-slate-50/80 hover:shadow-md"
                >
                  <div className="w-full aspect-square max-w-[110px] rounded-2xl bg-slate-100/80 border border-slate-200/60 group-hover:bg-slate-200/80 flex items-center justify-center p-2 group-hover:scale-105 transition-all">
                    <PlumberGraphic className="w-full h-full" />
                  </div>
                  <span className="text-sm font-bold text-slate-800 mt-2.5 group-hover:text-slate-900 transition-colors">
                    Plumber
                  </span>
                </button>

                {/* Option 3: Carpentry */}
                <button
                  type="button"
                  onClick={() => {
                    setIsElecModalOpen(false)
                    document.body.style.overflow = "unset"
                    goToCategoryServices("carpentry")
                  }}
                  className="group flex flex-col items-center justify-between p-2.5 sm:p-3 rounded-2xl transition-all text-center focus:outline-none cursor-pointer border-2 border-transparent hover:border-slate-300 hover:bg-slate-50/80 hover:shadow-md"
                >
                  <div className="w-full aspect-square max-w-[110px] rounded-2xl bg-slate-100/80 border border-slate-200/60 group-hover:bg-slate-200/80 flex items-center justify-center p-2 group-hover:scale-105 transition-all">
                    <CarpentryGraphic className="w-full h-full" />
                  </div>
                  <span className="text-sm font-bold text-slate-800 mt-2.5 group-hover:text-slate-900 transition-colors">
                    Carpentry
                  </span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ── AC & Appliance Sub-Category Modal Popup ── */}
      {isAcModalOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ac-modal-title"
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsAcModalOpen(false)}
          >
            <div
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-3xl w-full shadow-2xl border border-slate-100 relative max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setIsAcModalOpen(false)}
                aria-label="Close popup"
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Modal Title */}
              <div className="text-center mb-6">
                <h3
                  id="ac-modal-title"
                  className="text-lg sm:text-xl font-extrabold text-slate-900"
                >
                  AC &amp; Appliance Repair
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Choose an appliance type to view related services
                </p>
              </div>

              {/* Items Grid for AC & Appliance Repair (5 options) */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4 items-stretch">
                {/* Option 1: AC Service */}
                <button
                  type="button"
                  onClick={() => {
                    setIsAcModalOpen(false)
                    document.body.style.overflow = "unset"
                    goToCategoryServices("hvac", "AC Service & Cleaning")
                  }}
                  className="group flex flex-col items-center justify-between p-2.5 sm:p-3 rounded-2xl transition-all text-center focus:outline-none cursor-pointer border-2 border-transparent hover:border-slate-300 hover:bg-slate-50/80 hover:shadow-md"
                >
                  <div className="w-full aspect-square max-w-[110px] rounded-2xl bg-slate-100/80 border border-slate-200/60 group-hover:bg-slate-200/80 flex items-center justify-center p-2 group-hover:scale-105 transition-all">
                    <AcGraphic className="w-full h-full" />
                  </div>
                  <span className="text-sm font-bold text-slate-800 mt-2.5 group-hover:text-slate-900 transition-colors">
                    Air Conditioner
                  </span>
                </button>

                {/* Option 2: Refrigerator */}
                <button
                  type="button"
                  onClick={() => {
                    setIsAcModalOpen(false)
                    document.body.style.overflow = "unset"
                    goToCategoryServices("refrigerator", "Refrigerator Service & Repair")
                  }}
                  className="group flex flex-col items-center justify-between p-2.5 sm:p-3 rounded-2xl transition-all text-center focus:outline-none cursor-pointer border-2 border-transparent hover:border-slate-300 hover:bg-slate-50/80 hover:shadow-md"
                >
                  <div className="w-full aspect-square max-w-[110px] rounded-2xl bg-slate-100/80 border border-slate-200/60 group-hover:bg-slate-200/80 flex items-center justify-center p-2 group-hover:scale-105 transition-all">
                    <FridgeGraphic className="w-full h-full" />
                  </div>
                  <span className="text-sm font-bold text-slate-800 mt-2.5 group-hover:text-slate-900 transition-colors">
                    Refrigerator
                  </span>
                </button>

                {/* Option 3: Washing Machine */}
                <button
                  type="button"
                  onClick={() => {
                    setIsAcModalOpen(false)
                    document.body.style.overflow = "unset"
                    goToCategoryServices("washing_machine", "Washing Machine Jet Service")
                  }}
                  className="group flex flex-col items-center justify-between p-2.5 sm:p-3 rounded-2xl transition-all text-center focus:outline-none cursor-pointer border-2 border-transparent hover:border-slate-300 hover:bg-slate-50/80 hover:shadow-md"
                >
                  <div className="w-full aspect-square max-w-[110px] rounded-2xl bg-slate-100/80 border border-slate-200/60 group-hover:bg-slate-200/80 flex items-center justify-center p-2 group-hover:scale-105 transition-all">
                    <WashingMachineGraphic className="w-full h-full" />
                  </div>
                  <span className="text-sm font-bold text-slate-800 mt-2.5 group-hover:text-slate-900 transition-colors">
                    Washing Machine
                  </span>
                </button>

                {/* Option 4: TV & Home Theatre */}
                <button
                  type="button"
                  onClick={() => {
                    setIsAcModalOpen(false)
                    document.body.style.overflow = "unset"
                    goToCategoryServices("tv_display", "TV Service & Repair")
                  }}
                  className="group flex flex-col items-center justify-between p-2.5 sm:p-3 rounded-2xl transition-all text-center focus:outline-none cursor-pointer border-2 border-transparent hover:border-slate-300 hover:bg-slate-50/80 hover:shadow-md"
                >
                  <div className="w-full aspect-square max-w-[110px] rounded-2xl bg-slate-100/80 border border-slate-200/60 group-hover:bg-slate-200/80 flex items-center justify-center p-2 group-hover:scale-105 transition-all">
                    <TvGraphic className="w-full h-full" />
                  </div>
                  <span className="text-sm font-bold text-slate-800 mt-2.5 group-hover:text-slate-900 transition-colors">
                    TV &amp; Display
                  </span>
                </button>

                {/* Option 5: Microwave Oven */}
                <button
                  type="button"
                  onClick={() => {
                    setIsAcModalOpen(false)
                    document.body.style.overflow = "unset"
                    goToCategoryServices("microwave", "Microwave Repair")
                  }}
                  className="group flex flex-col items-center justify-between p-2.5 sm:p-3 rounded-2xl transition-all text-center focus:outline-none cursor-pointer border-2 border-transparent hover:border-slate-300 hover:bg-slate-50/80 hover:shadow-md"
                >
                  <div className="w-full aspect-square max-w-[110px] rounded-2xl bg-slate-100/80 border border-slate-200/60 group-hover:bg-slate-200/80 flex items-center justify-center p-2 group-hover:scale-105 transition-all">
                    <MicrowaveGraphic className="w-full h-full" />
                  </div>
                  <span className="text-sm font-bold text-slate-800 mt-2.5 group-hover:text-slate-900 transition-colors">
                    Microwave Oven
                  </span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ── 1. Food and Health Sub-Modules Modal Popup ── */}
      {isFoodHealthModalOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="food-health-modal-title"
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => {
              setIsFoodHealthModalOpen(false)
              setSelectedFoodSubModuleId(null)
              setFoodOrderPlaced(false)
            }}
          >
            <div
              className={`bg-white rounded-3xl w-full shadow-2xl border border-slate-100 relative flex flex-col max-h-[90vh] overflow-hidden transition-all ${
                selectedFoodSubModule ? "max-w-5xl" : "max-w-xl"
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => {
                  setIsFoodHealthModalOpen(false)
                  setSelectedFoodSubModuleId(null)
                  setFoodOrderPlaced(false)
                  setVegSearchQuery("")
                  setVegCategoryFilter("All")
                }}
                aria-label="Close popup"
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 hover:bg-emerald-50 text-slate-500 hover:text-emerald-800 flex items-center justify-center transition-colors cursor-pointer z-40"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Pinned Modal Header (When viewing a sub-module detail) */}
              {selectedFoodSubModule && (
                <div className="px-5 sm:px-7 pt-5 sm:pt-6 pb-3 border-b border-slate-100 bg-white shrink-0">
                  {/* Back Link & Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-3 pr-10">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFoodSubModuleId(null)
                        setFoodOrderPlaced(false)
                        setVegSearchQuery("")
                        setVegCategoryFilter("All")
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-extrabold text-slate-600 hover:text-emerald-700 cursor-pointer transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Back to Categories</span>
                    </button>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-extrabold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
                        <span>⚡</span> Hosur Hub • ⏱ 8 Mins Delivery
                      </span>
                    </div>
                  </div>

                  {/* Title and Search Row (only for live catalogs, not Coming Soon) */}
                  {selectedFoodSubModule.id !== "groceries" && (
                    <>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <h4 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                            {selectedFoodSubModule.name}
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                              {selectedFoodSubModule.items.length} items
                            </span>
                          </h4>
                          <p className="text-xs text-slate-500 font-medium">
                            {selectedFoodSubModule.tagline}
                          </p>
                        </div>

                        {/* Search Bar */}
                        <div className="relative min-w-[240px]">
                          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={vegSearchQuery}
                            onChange={(e) => setVegSearchQuery(e.target.value)}
                            placeholder={`Search ${selectedFoodSubModule.name.toLowerCase()} (e.g. Onion, Tomato)...`}
                            className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-none bg-slate-50/50"
                          />
                          {vegSearchQuery && (
                            <button
                              type="button"
                              onClick={() => setVegSearchQuery("")}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Category Filter Pills (if vegetables) */}
                      {selectedFoodSubModule.id === "vegetables" && (
                        <div className="flex items-center gap-2 overflow-x-auto pt-3 no-scrollbar">
                          {["All", "Daily Essentials", "Herbs & Leafy", "Gourds & Roots", "Organic & Exotic", "Herbs & Seasoning"].map((cat) => (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => setVegCategoryFilter(cat)}
                              className={`px-3 py-1 rounded-full text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
                                vegCategoryFilter === cat
                                  ? "bg-emerald-600 text-white shadow-xs"
                                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                              }`}
                            >
                              {cat}
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Scrollable Body Container (Optimized for smooth 60fps scrolling) */}
              <div
                className="flex-1 overflow-y-auto p-5 sm:p-7 overscroll-contain"
                style={{
                  overscrollBehavior: "contain",
                  WebkitOverflowScrolling: "touch",
                  willChange: "scroll-position",
                  transform: "translateZ(0)",
                }}
              >
                {!selectedFoodSubModule ? (
                  /* Sub-Modules Main View: Groceries & Vegetables (Compact & Attractive Emerald UI) */
                  <div>
                    <div className="text-center mb-6">
                      <h3
                        id="food-health-modal-title"
                        className="text-lg sm:text-xl font-extrabold text-slate-900"
                      >
                        Food and Health
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Choose a category to view items &amp; schedule fast delivery
                      </p>
                    </div>

                    {/* 2 Compact & Attractive Sub-Module Cards */}
                    <div className="grid grid-cols-2 gap-4 items-stretch max-w-lg mx-auto">
                      {foodHealthSub.map((sub, index) => {
                        const isGroceries = sub.id === "groceries"
                        const borderHoverClass = isGroceries 
                          ? "hover:border-amber-400 hover:bg-amber-50/20" 
                          : "hover:border-emerald-500 hover:bg-emerald-50/30"
                        const textHoverClass = isGroceries 
                          ? "group-hover:text-amber-800" 
                          : "group-hover:text-emerald-700"
                        const badgeBgClass = isGroceries 
                          ? "bg-amber-100 text-amber-900 border-amber-300" 
                          : "bg-emerald-100/80 text-emerald-800 border-emerald-200"

                        return (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={() => {
                              setSelectedFoodSubModuleId(sub.id)
                              setFoodOrderPlaced(false)
                              setVegSearchQuery("")
                              setVegCategoryFilter("All")
                            }}
                            className={`group flex flex-col items-center justify-between p-3.5 sm:p-4 rounded-2xl transition-all text-center focus:outline-none cursor-pointer border-2 border-slate-100 hover:shadow-md bg-white relative ${borderHoverClass}`}
                          >
                            <div className="w-full aspect-square max-w-[125px] rounded-2xl bg-slate-50 group-hover:bg-white border border-slate-100/80 overflow-hidden flex items-center justify-center p-1 group-hover:scale-105 transition-all shadow-2xs relative">
                              <img
                                src={sub.image || (isGroceries ? "/mockups/groceries_realistic.png" : "/mockups/vegetables_realistic.png")}
                                alt={sub.name}
                                className="w-full h-full object-cover rounded-xl"
                              />
                              {isGroceries && (
                                <div className="absolute top-2 right-2 bg-amber-500 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full shadow-xs">
                                  Coming Soon
                                </div>
                              )}
                            </div>
                            <div className="mt-3">
                              <span className={`text-sm sm:text-base font-bold text-slate-900 ${textHoverClass} transition-colors block`}>
                                {sub.name}
                              </span>
                              <span className="text-[11px] text-slate-500 font-medium mt-0.5 block leading-tight">
                                {sub.desc || sub.tagline || ""}
                              </span>
                              <span className={`inline-block mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${badgeBgClass}`}>
                                {isGroceries ? "⏳ " : "🌱 "}{sub.badge || ""}
                              </span>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  /* Sub-Module Detail Catalog View */
                  <div>
                    {selectedFoodSubModuleId === "groceries" ? (
                      <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-b from-amber-50/60 to-orange-50/20 border-2 border-amber-200/70 text-center my-4">
                        <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl overflow-hidden mx-auto mb-4 border-2 border-amber-200 shadow-lg">
                          <img
                            src="/mockups/groceries_realistic.png"
                            alt="Groceries Coming Soon"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-extrabold mb-3 border border-amber-300 shadow-2xs">
                          <span>⏳</span> Coming Soon to Hosur
                        </div>
                        <h4 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                          Groceries Delivery is Coming Soon!
                        </h4>
                        <p className="text-xs sm:text-sm text-slate-600 font-medium mt-2 max-w-md mx-auto leading-relaxed">
                          We are currently expanding our express fulfillment network in Hosur to deliver packaged staples, daily essentials, and dairy directly to your doorstep.
                        </p>
                        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedFoodSubModuleId(foodHealthSub[1].id)
                              setFoodOrderPlaced(false)
                              setVegSearchQuery("")
                              setVegCategoryFilter("All")
                            }}
                            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm transition-all shadow-md cursor-pointer flex items-center gap-2"
                          >
                            <span>Order Fresh Vegetables</span>
                            <span>&rarr;</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedFoodSubModuleId(null)
                              setFoodOrderPlaced(false)
                            }}
                            className="px-5 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs sm:text-sm transition-all border border-slate-200 cursor-pointer"
                          >
                            Back to Categories
                          </button>
                        </div>
                      </div>
                    ) : foodOrderPlaced ? (
                      <div className="p-8 rounded-3xl bg-gradient-to-b from-emerald-50 to-teal-50 border-2 border-emerald-200 text-center my-6">
                        <div className="w-14 h-14 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto mb-3 shadow-md shadow-emerald-600/30">
                          <Check className="w-8 h-8 stroke-[3]" />
                        </div>
                        <h5 className="text-xl font-extrabold text-emerald-950">
                          Order Confirmed Successfully!
                        </h5>
                        <p className="text-xs sm:text-sm text-emerald-800 font-medium mt-1.5 max-w-md mx-auto">
                          Your fresh {selectedFoodSubModule?.name?.toLowerCase() || ""} order has been placed. Our Hosur delivery partner is packing and dispatching your items within 8-10 minutes.
                        </p>
                        <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white text-emerald-800 text-xs font-bold border border-emerald-200">
                          <span>📍 Delivery to:</span> Hosur Central &bull; ⏱ ETA: 8-12 mins
                        </div>
                        <div className="mt-6">
                          <button
                            type="button"
                            onClick={() => {
                              setFoodCart({})
                              setFoodOrderPlaced(false)
                              setSelectedFoodSubModuleId(null)
                            }}
                            className="px-6 py-2.5 rounded-xl bg-emerald-600 text-white font-extrabold text-xs sm:text-sm hover:bg-emerald-700 cursor-pointer shadow-md transition-all"
                          >
                            Back to Home
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Products Grid matching Quick Commerce Layout */}
                        {(selectedFoodSubModule?.items || []).filter((item) => {
                          const q = vegSearchQuery.toLowerCase()
                          const matchesSearch =
                            !vegSearchQuery ||
                            item.name.toLowerCase().includes(q) ||
                            (item.category && item.category.toLowerCase().includes(q))
                          const matchesCat =
                            vegCategoryFilter === "All" || item.category === vegCategoryFilter
                          return matchesSearch && matchesCat
                        }).length === 0 ? (
                          <div className="py-12 text-center">
                            <p className="text-sm font-bold text-slate-500">No items found matching your search.</p>
                            <button
                              type="button"
                              onClick={() => {
                                setVegSearchQuery("")
                                setVegCategoryFilter("All")
                              }}
                              className="mt-2 text-xs font-bold text-emerald-600 hover:underline"
                            >
                              Clear filters
                            </button>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-3.5 mb-2">
                            {selectedFoodSubModule.items
                              .filter((item) => {
                                const q = vegSearchQuery.toLowerCase()
                                const matchesSearch =
                                  !vegSearchQuery ||
                                  item.name.toLowerCase().includes(q) ||
                                  (item.category && item.category.toLowerCase().includes(q))
                                const matchesCat =
                                  vegCategoryFilter === "All" || item.category === vegCategoryFilter
                                return matchesSearch && matchesCat
                              })
                              .map((item, idx) => {
                                const hasOptions = item.options && item.options.length > 0
                                const count = hasOptions
                                  ? item.options.reduce((sum, opt) => sum + (foodCart[`${item.name} (${opt.unit})`] || 0), 0)
                                  : (foodCart[item.name] || 0)
                                return (
                                  <div
                                    key={idx}
                                    className="group rounded-2xl border border-slate-200/90 bg-white hover:border-emerald-500 hover:shadow-md flex flex-col justify-between transition-shadow duration-150 overflow-hidden"
                                    style={{
                                      contentVisibility: "auto",
                                      containIntrinsicSize: "0 230px",
                                    }}
                                  >
                                    <div>
                                      {/* Real Studio Photographic Product Image */}
                                      <div className="relative w-full aspect-square bg-[#f5f1eb] overflow-hidden">
                                        <img
                                          src={item.image || getFoodItemPhoto(item.name, selectedFoodSubModule.id === "groceries")}
                                          alt={item.name}
                                          loading="lazy"
                                          decoding="async"
                                          className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                                          onError={(e) => {
                                            if (e.target.src.includes("/mockups/")) {
                                              e.target.onerror = null
                                              e.target.src = "/mockups/category_food_health.png"
                                            } else {
                                              e.target.src = getFoodItemPhoto(item.name, selectedFoodSubModule?.id === "groceries")
                                            }
                                          }}
                                        />
                                        <div className="absolute top-2 left-2 flex items-center gap-1 bg-white px-2 py-0.5 rounded-md text-[10px] font-black text-slate-700 shadow-2xs">
                                          <Clock className="w-2.5 h-2.5 text-emerald-600" />
                                          <span>{item.delivery || "8 MINS"}</span>
                                        </div>
                                        {item.discount && (
                                          <div className="absolute top-2 right-2 bg-amber-500 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-md shadow-xs uppercase tracking-wider">
                                            {item.discount}
                                          </div>
                                        )}
                                      </div>

                                      {/* Details */}
                                      <div className="p-2.5">
                                        <h5 className="text-xs font-bold text-slate-900 line-clamp-2 leading-tight min-h-[30px]" title={item.name}>
                                          {item.name}
                                        </h5>
                                        <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
                                          {item.unit}
                                        </p>
                                      </div>
                                    </div>

                                    {/* Price and Add CTA */}
                                    <div className="p-2.5 pt-0 flex items-center justify-between gap-1.5 mt-auto">
                                      <div>
                                        <div className="flex items-center gap-1">
                                          <span className="text-xs sm:text-sm font-extrabold text-slate-900">
                                            ₹{item.price}
                                          </span>
                                        </div>
                                        {item.mrp && (
                                          <span className="text-[10px] text-slate-400 line-through">
                                            ₹{item.mrp}
                                          </span>
                                        )}
                                      </div>

                                      {hasOptions ? (
                                        count > 0 ? (
                                          <button
                                            type="button"
                                            onClick={() => setVariantModalItem(item)}
                                            className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-extrabold text-[11px] shadow-xs flex items-center gap-1 cursor-pointer"
                                          >
                                            <span>{count} in Cart</span>
                                            <ChevronDown className="w-2.5 h-2.5" />
                                          </button>
                                        ) : (
                                          <button
                                            type="button"
                                            onClick={() => setVariantModalItem(item)}
                                            className="px-3.5 py-1 rounded-lg border-2 border-emerald-600 text-emerald-700 hover:bg-emerald-600 hover:text-white font-extrabold text-[11px] transition-all cursor-pointer active:scale-95 bg-white flex items-center gap-1"
                                          >
                                            <span>ADD</span>
                                            <ChevronDown className="w-2.5 h-2.5" />
                                          </button>
                                        )
                                      ) : count > 0 ? (
                                        <div className="flex items-center bg-emerald-600 text-white rounded-lg px-1.5 py-1 shadow-xs">
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setFoodCart((prev) => ({
                                                ...prev,
                                                [item.name]: Math.max(0, (prev[item.name] || 0) - 1),
                                              }))
                                            }
                                            className="text-white hover:text-emerald-100 font-black text-xs cursor-pointer px-1"
                                          >
                                            -
                                          </button>
                                          <span className="text-xs font-extrabold min-w-[14px] text-center px-0.5">
                                            {count}
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setFoodCart((prev) => ({
                                                ...prev,
                                                [item.name]: (prev[item.name] || 0) + 1,
                                              }))
                                            }
                                            className="text-white hover:text-emerald-100 font-black text-xs cursor-pointer px-1"
                                          >
                                            +
                                          </button>
                                        </div>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setFoodCart((prev) => ({
                                              ...prev,
                                              [item.name]: 1,
                                            }))
                                          }
                                          className="px-3.5 py-1 rounded-lg border-2 border-emerald-600 text-emerald-700 hover:bg-emerald-600 hover:text-white font-extrabold text-[11px] transition-all cursor-pointer active:scale-95 bg-white"
                                        >
                                          ADD
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                )
                              })}
                          </div>
                        )}

                        {/* Quick Pack/Weight Options Modal */}
                        {variantModalItem && (
                          <div
                            className="fixed inset-0 z-[10000] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
                            onClick={() => setVariantModalItem(null)}
                          >
                            <div
                              className="relative bg-white rounded-3xl p-6 sm:p-7 max-w-sm w-full shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {/* Floating Close Button on top */}
                              <button
                                type="button"
                                onClick={() => setVariantModalItem(null)}
                                className="absolute -top-4 right-1/2 translate-x-1/2 sm:translate-x-0 sm:right-3 sm:-top-4 w-9 h-9 rounded-full bg-slate-900 text-white hover:bg-slate-800 flex items-center justify-center shadow-lg transition-transform hover:scale-105 cursor-pointer z-10"
                              >
                                <X className="w-4 h-4" />
                              </button>

                              {/* Modal Header */}
                              <h4 className="text-base sm:text-lg font-black text-slate-900 mb-4 pr-6">
                                {variantModalItem.name}
                              </h4>

                              {/* Options List */}
                              <div className="space-y-3">
                                {variantModalItem.options?.map((opt, oIdx) => {
                                  const cartKey = `${variantModalItem.name} (${opt.unit})`
                                  const optCount = foodCart[cartKey] || 0
                                  return (
                                    <div
                                      key={oIdx}
                                      className="bg-white rounded-2xl border border-slate-200/90 p-3 flex items-center justify-between gap-3 shadow-xs hover:border-emerald-500 transition-all"
                                    >
                                      {/* Left: Product Thumbnail */}
                                      <div className="w-14 h-14 rounded-xl bg-[#f5f1eb] overflow-hidden shrink-0">
                                        <img
                                          src={variantModalItem.image || getFoodItemPhoto(variantModalItem.name, false)}
                                          alt={variantModalItem.name}
                                          className="w-full h-full object-cover"
                                        />
                                      </div>

                                      {/* Middle: Unit & Price */}
                                      <div className="flex-1 min-w-0">
                                        <div className="text-xs font-bold text-slate-800">
                                          {opt.unit}
                                        </div>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                          <span className="text-xs sm:text-sm font-black text-slate-900">
                                            ₹{opt.price}
                                          </span>
                                          {opt.mrp && (
                                            <span className="text-[10px] text-slate-400 line-through">
                                              ₹{opt.mrp}
                                            </span>
                                          )}
                                        </div>
                                      </div>

                                      {/* Right: Add/Quantity Control */}
                                      <div className="shrink-0">
                                        {optCount > 0 ? (
                                          <div className="flex items-center bg-emerald-600 text-white rounded-lg px-1.5 py-1 shadow-xs">
                                            <button
                                              type="button"
                                              onClick={() =>
                                                setFoodCart((prev) => ({
                                                  ...prev,
                                                  [cartKey]: Math.max(0, (prev[cartKey] || 0) - 1),
                                                }))
                                              }
                                              className="text-white hover:text-emerald-100 font-black text-xs cursor-pointer px-1"
                                            >
                                              -
                                            </button>
                                            <span className="text-xs font-extrabold min-w-[14px] text-center px-0.5">
                                              {optCount}
                                            </span>
                                            <button
                                              type="button"
                                              onClick={() =>
                                                setFoodCart((prev) => ({
                                                  ...prev,
                                                  [cartKey]: (prev[cartKey] || 0) + 1,
                                                }))
                                              }
                                              className="text-white hover:text-emerald-100 font-black text-xs cursor-pointer px-1"
                                            >
                                              +
                                            </button>
                                          </div>
                                        ) : (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setFoodCart((prev) => ({
                                                ...prev,
                                                [cartKey]: 1,
                                              }))
                                            }
                                            className="px-4 py-1.5 rounded-lg border-2 border-emerald-600 text-emerald-700 hover:bg-emerald-600 hover:text-white font-extrabold text-xs transition-all cursor-pointer active:scale-95 bg-white"
                                          >
                                            ADD
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Pinned Fixed Bottom Action Bar */}
              {selectedFoodSubModule && selectedFoodSubModule.id !== "groceries" && !foodOrderPlaced && (
                <div className="px-5 sm:px-7 py-3.5 bg-white border-t border-slate-200 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-[0_-8px_20px_rgba(0,0,0,0.06)] rounded-b-3xl">
                  <div className="text-xs text-slate-600 font-semibold">
                    {Object.values(foodCart).reduce((a, b) => a + b, 0) > 0 ? (
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-extrabold text-xs">
                          {Object.values(foodCart).reduce((a, b) => a + b, 0)} items in cart
                        </span>
                        <span className="text-slate-800 font-bold">
                          Total: ₹
                          {Object.entries(foodCart).reduce((sum, [nameWithUnit, qty]) => {
                            if (qty <= 0) return sum
                            let matchedPrice = 0
                            if (selectedFoodSubModule?.items) {
                              for (const it of selectedFoodSubModule.items) {
                                if (it.options) {
                                  for (const opt of it.options) {
                                    if (`${it.name} (${opt.unit})` === nameWithUnit) {
                                      matchedPrice = opt.price
                                      break
                                    }
                                  }
                                }
                                if (matchedPrice) break
                                if (it.name === nameWithUnit) {
                                  matchedPrice = it.price
                                  break
                                }
                              }
                            }
                            return sum + matchedPrice * qty
                          }, 0)}
                        </span>
                      </div>
                    ) : (
                      <span>Select vegetables above for instant Hosur door delivery</span>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={Object.values(foodCart).reduce((a, b) => a + b, 0) === 0}
                    onClick={() => {
                      const itemsList = []
                      Object.entries(foodCart).forEach(([nameWithUnit, qty]) => {
                        if (qty <= 0) return
                        let matchedItem = null
                        let unit = "1 unit"
                        let price = 0
                        let mrp = 0
                        let baseName = nameWithUnit

                        if (selectedFoodSubModule?.items) {
                          for (const it of selectedFoodSubModule.items) {
                            if (it.options) {
                              for (const opt of it.options) {
                                if (`${it.name} (${opt.unit})` === nameWithUnit) {
                                  matchedItem = it
                                  unit = opt.unit
                                  price = opt.price
                                  mrp = opt.mrp || Math.round(opt.price * 1.2)
                                  baseName = it.name
                                  break
                                }
                              }
                            }
                            if (matchedItem) break
                            if (it.name === nameWithUnit) {
                              matchedItem = it
                              unit = it.unit
                              price = it.price
                              mrp = it.mrp || Math.round(it.price * 1.2)
                              baseName = it.name
                              break
                            }
                          }
                        }

                        itemsList.push({
                          id: `veg_${nameWithUnit.replace(/[^a-zA-Z0-9]/g, "_")}`,
                          name: baseName,
                          displayName: nameWithUnit,
                          unit: unit,
                          price: price || 30,
                          mrp: mrp || (price ? Math.round(price * 1.2) : 36),
                          quantity: qty,
                          image: matchedItem?.image || getFoodItemPhoto(baseName, selectedFoodSubModule?.id === "groceries"),
                          serviceType: "vegetables_quick_delivery",
                          deliveryMins: "15-25 mins",
                        })
                      })

                      if (itemsList.length === 0) return

                      document.body.style.overflow = ""
                      setIsFoodHealthModalOpen(false)
                      setSelectedFoodSubModuleId(null)
                      navigate(routes.booking_checkout, {
                        state: {
                          category: {
                            id: "vegetables_quick_delivery",
                            name: selectedFoodSubModule?.name || "Farm-Fresh Vegetables",
                            isQuickCommerce: true,
                            deliveryTime: "15-25 mins",
                            foodSubModuleId: selectedFoodSubModule?.id || "vegetables",
                          },
                          cart: itemsList,
                          isQuickCommerce: true,
                          foodCart: foodCart,
                          foodSubModuleId: selectedFoodSubModule?.id || "vegetables",
                        }
                      })
                    }}
                    className={`w-full sm:w-auto px-6 py-2.5 rounded-xl font-extrabold text-xs sm:text-sm transition-all shadow-md flex items-center justify-center gap-2 ${
                      Object.values(foodCart).reduce((a, b) => a + b, 0) > 0
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/25 cursor-pointer active:scale-98"
                        : "bg-slate-200 text-slate-400 cursor-not-allowed"
                    }`}
                  >
                    <span>Confirm &amp; Schedule {selectedFoodSubModule.name} Delivery</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}

      {/* ── 2. For You Curated Services Modal Popup ── */}
      {isForYouModalOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="foryou-modal-title"
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsForYouModalOpen(false)}
          >
            <div
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-3xl w-full shadow-2xl border border-slate-100 relative max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setIsForYouModalOpen(false)}
                aria-label="Close popup"
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 hover:bg-emerald-50 text-slate-500 hover:text-emerald-700 flex items-center justify-center transition-colors cursor-pointer z-10"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-extrabold uppercase tracking-wider mb-2">
                  ✦ Personalized Recommendations
                </div>
                <h3
                  id="foryou-modal-title"
                  className="text-xl sm:text-2xl font-extrabold text-slate-900"
                >
                  Curated For You
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md mx-auto">
                  Top-rated doorstep services and instant transport tailored for fast booking in your locality.
                </p>
              </div>

              {/* Grid of 6 For You Sub Services */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {FOR_YOU_SUB.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setIsForYouModalOpen(false)
                      document.body.style.overflow = "unset"
                      if (item.action === "truck") {
                        navigate(routes.truck_booking_hosur)
                      } else if (item.action === "two_wheeler") {
                        navigate(routes.two_wheeler_booking_hosur)
                      } else if (item.categoryId === "cleaning") {
                        setIsHomePestModalOpen(true)
                      } else if (item.categoryId === "hvac") {
                        setIsAcModalOpen(true)
                      } else if (item.categoryId === "electrical") {
                        setIsElecModalOpen(true)
                      } else {
                        goToCategoryServices(item.categoryId)
                      }
                    }}
                    className="group p-4 rounded-2xl border-2 border-slate-100 hover:border-emerald-500 bg-slate-50/60 hover:bg-emerald-50/30 flex flex-col justify-between text-left transition-all hover:shadow-md cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          {item.badge}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                      <div className="w-14 h-14 rounded-xl bg-white border border-slate-200/80 flex items-center justify-center p-2 mb-3 group-hover:scale-105 transition-transform">
                        {typeof item.graphic === "function" && item.graphic.prototype ? (
                          <item.graphic className="w-10 h-10" />
                        ) : (
                          <item.graphic className="w-10 h-10" />
                        )}
                      </div>
                      <h4 className="text-sm font-extrabold text-slate-900 group-hover:text-emerald-700 transition-colors">
                        {item.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 font-medium mt-1 leading-snug">
                        {item.subtitle}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ── 3. Home, Repair & Transport Services Combined Modal Popup ── */}
      {isHomeServicesCombinedModalOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="home-combined-modal-title"
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsHomeServicesCombinedModalOpen(false)}
          >
            <div
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-4xl w-full shadow-2xl border border-slate-100 relative max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setIsHomeServicesCombinedModalOpen(false)}
                aria-label="Close popup"
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 hover:bg-teal-50 text-slate-500 hover:text-teal-800 flex items-center justify-center transition-colors cursor-pointer z-10"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-100 text-teal-900 text-xs font-extrabold uppercase tracking-wider mb-2">
                  ⚡ 6 Core Specialized Pillars
                </div>
                <h3
                  id="home-combined-modal-title"
                  className="text-xl sm:text-2xl font-extrabold text-slate-900"
                >
                  Home, Repair &amp; Transport Services
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-lg mx-auto">
                  Select any service below to explore specific options, verified technicians, and transparent pricing.
                </p>
              </div>

              {/* 6 Combined Services Grid matching the exact items from the 3rd image */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-4">
                {CATEGORIES.map(({ label, icon: Icon, photo, serviceCategoryId }) => (
                  <button
                    key={label}
                    onClick={() => {
                      setIsHomeServicesCombinedModalOpen(false)
                      document.body.style.overflow = "unset"
                      if (label === "Goods & Transports") {
                        setIsGoodsModalOpen(true)
                      } else if (label.includes("Electrician") || label.includes("Plumbing") || label.includes("Carpentry")) {
                        setIsElecModalOpen(true)
                      } else if (label.includes("AC") || label.includes("Appliance")) {
                        setIsAcModalOpen(true)
                      } else if (label === "Home Services & Pest Control") {
                        setIsHomePestModalOpen(true)
                      } else {
                        goToCategoryServices(serviceCategoryId)
                      }
                    }}
                    className="group flex flex-col bg-white rounded-2xl border-2 border-slate-100 hover:border-teal-500 overflow-hidden text-center hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer"
                  >
                    {photo ? (
                      <div className="h-24 w-full overflow-hidden bg-slate-100">
                        <img
                          src={photo}
                          alt={label}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    ) : (
                      <div className="h-24 w-full bg-teal-50 flex items-center justify-center">
                        <Icon className="w-8 h-8 text-teal-600" strokeWidth={1.5} />
                      </div>
                    )}
                    <span className="text-xs font-extrabold text-slate-700 leading-snug p-3 group-hover:text-teal-800 transition-colors">
                      {label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ── Trust strip ────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6">
        <div className="bg-slate-50 border border-slate-200 rounded-3xl grid sm:grid-cols-2 lg:grid-cols-5 gap-6 p-8">
          {TRUST_STRIP.map(({ icon: Icon, title, body }, idx) => {
            const iconColors = ["text-teal-600", "text-rose-500", "text-violet-600", "text-amber-500", "text-sky-500"]
            return (
              <div key={title} className="flex flex-col items-start gap-2">
                <Icon className={`w-6 h-6 ${iconColors[idx % iconColors.length]}`} strokeWidth={1.75} />
                <p className="text-sm font-bold text-slate-800 leading-snug">{title}</p>
                <p className="text-xs text-slate-500 leading-relaxed">{body}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── Offers ─────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 py-14 grid lg:grid-cols-[220px_1fr] gap-6 items-stretch">
        <div className="bg-gradient-to-br from-teal-600 to-emerald-700 rounded-3xl p-6 flex flex-col justify-center">
          <p className="text-lg font-extrabold text-white mb-1">Limited Time Offers!</p>
          <p className="text-xs text-teal-100 mb-4">Great deals on services you love.</p>
          <button onClick={goToBooking} className="bg-white text-teal-700 hover:bg-teal-50 text-xs font-bold px-4 py-2 rounded-full self-start transition-colors">
            Explore Offers
          </button>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { tag: "UPTO", big: "20% OFF", sub: "on Home Cleaning", bg: "bg-amber-50 hover:bg-amber-100", tag_color: "text-amber-600", link_color: "text-amber-700" },
            { tag: "FLAT", big: "15% OFF", sub: "on Painting",      bg: "bg-rose-50 hover:bg-rose-100",   tag_color: "text-rose-600",  link_color: "text-rose-700"  },
            { tag: "UPTO", big: "₹500 OFF", sub: "on AC Service",   bg: "bg-violet-50 hover:bg-violet-100", tag_color: "text-violet-600", link_color: "text-violet-700" },
          ].map((offer) => (
            <button
              key={offer.sub}
              onClick={goToBooking}
              className={`${offer.bg} rounded-3xl p-6 text-left hover:shadow-md transition-all`}
            >
              <p className={`text-[11px] font-bold tracking-wide ${offer.tag_color}`}>{offer.tag}</p>
              <p className="text-2xl font-extrabold text-slate-900 mb-1">{offer.big}</p>
              <p className="text-sm text-slate-600 mb-4">{offer.sub}</p>
              <span className={`text-xs font-semibold ${offer.link_color}`}>Book Now &rarr;</span>
            </button>
          ))}
        </div>
      </section>

      {/* ── How It Works ───────────────────────────────────── */}
      <section id="how-it-works" className="max-w-7xl mx-auto px-6 py-10">
        <h2 className="text-xl font-bold text-slate-900 text-center mb-10">How It Works</h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-8">
          {STEPS.map(({ icon: Icon, title, body }, i) => {
            const stepColors = [
              { bg: "bg-teal-50",   icon: "text-teal-600",   badge: "bg-teal-600"   },
              { bg: "bg-rose-50",   icon: "text-rose-500",   badge: "bg-rose-500"   },
              { bg: "bg-violet-50", icon: "text-violet-600", badge: "bg-violet-600" },
              { bg: "bg-amber-50",  icon: "text-amber-500",  badge: "bg-amber-500"  },
              { bg: "bg-sky-50",    icon: "text-sky-500",    badge: "bg-sky-500"    },
            ]
            const c = stepColors[i % stepColors.length]
            return (
              <div key={title} className="flex flex-col items-center text-center gap-3">
                <div className="relative">
                  <div className={`w-16 h-16 rounded-full ${c.bg} flex items-center justify-center`}>
                    <Icon className={`w-7 h-7 ${c.icon}`} strokeWidth={1.75} />
                  </div>
                  <span className={`absolute -top-1 -left-1 w-5 h-5 rounded-full ${c.badge} text-white text-[10px] font-bold flex items-center justify-center`}>
                    {i + 1}
                  </span>
                </div>
                <p className="text-sm font-bold text-slate-800">{title}</p>
                <p className="text-xs text-slate-500 leading-relaxed">{body}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── Stats ──────────────────────────────────────────── */}
      <section className="bg-slate-800 py-10">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 sm:grid-cols-5 gap-6 text-center text-white">
          {STATS.map((s) => (
            <div key={s.label}>
              <p className="text-2xl font-extrabold">{s.value}</p>
              <p className="text-xs text-slate-300">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Featured Professionals ─────────────────────────── */}
      <section id="professionals" className="max-w-7xl mx-auto px-6 py-14">
        <h2 className="text-xl font-bold text-slate-900 text-center mb-2">Featured Professionals</h2>
        <p className="text-sm text-slate-500 text-center mb-10">Top-rated experts ready to help</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {PROFESSIONALS.map((p) => (
            <div key={p.name} className="bg-white rounded-2xl border border-slate-100 overflow-hidden hover:shadow-md transition-shadow">
              <img src={p.photo} alt={p.name} className="w-full h-36 object-cover" />
              <div className="p-4">
                <p className="text-sm font-bold text-slate-800">{p.name}</p>
                <p className="text-xs text-slate-500 mb-2">{p.role}</p>
                <div className="flex items-center justify-between text-xs">
                  <span className="inline-flex items-center gap-1 font-semibold text-amber-500">
                    <Star className="w-3.5 h-3.5 fill-current" /> {p.rating}
                  </span>
                  <span className="text-slate-400">{p.jobs}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Testimonials ───────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 py-14 bg-slate-50 rounded-3xl">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-bold text-slate-900 mx-auto sm:mx-0">What Our Customers Say</h2>
          <a href="#" className="hidden sm:inline text-sm font-semibold text-teal-600 hover:text-teal-700 whitespace-nowrap">View all reviews &rarr;</a>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setTestimonialIdx((i) => (i - 1 + TESTIMONIALS.length) % TESTIMONIALS.length)}
            className="hidden sm:flex w-9 h-9 rounded-full border border-slate-200 items-center justify-center text-slate-400 hover:text-slate-700 shrink-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="grid sm:grid-cols-3 gap-5 flex-1">
            {TESTIMONIALS.map((t, i) => (
              <div key={t.name} className={`bg-white rounded-2xl border border-slate-100 p-5 ${i === testimonialIdx ? "ring-2 ring-teal-300 shadow-md" : ""}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-8 h-8 rounded-full bg-teal-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                    {t.initials}
                  </span>
                  <div className="flex gap-0.5 text-amber-400">
                    {Array.from({ length: 5 }).map((_, j) => <Star key={j} className="w-3.5 h-3.5 fill-current" />)}
                  </div>
                </div>
                <p className="text-sm text-slate-600 mb-3 leading-relaxed">{t.text}</p>
                <p className="text-sm font-bold text-slate-800">&mdash; {t.name}</p>
              </div>
            ))}
          </div>
          <button
            onClick={() => setTestimonialIdx((i) => (i + 1) % TESTIMONIALS.length)}
            className="hidden sm:flex w-9 h-9 rounded-full border border-slate-200 items-center justify-center text-slate-400 hover:text-slate-700 shrink-0"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="flex justify-center gap-1.5 mt-6">
          {TESTIMONIALS.map((_, i) => (
            <span key={i} className={`w-1.5 h-1.5 rounded-full ${i === testimonialIdx ? "bg-teal-600" : "bg-slate-200"}`} />
          ))}
        </div>
      </section>

      {/* ── App download banner ────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 pb-14">
        <div className="bg-gradient-to-r from-rose-500 to-amber-500 rounded-3xl px-8 py-7 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/25 flex items-center justify-center text-white shrink-0">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Book on the go!</p>
              <p className="text-lg font-extrabold text-white">Download the CalServices App</p>
              <p className="text-xs text-rose-100">Faster booking, real-time tracking &amp; exclusive app offers.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button className="bg-white text-rose-600 text-xs font-semibold px-4 py-2.5 rounded-xl hover:bg-rose-50 transition-colors">Get it on Google Play</button>
            <button className="bg-white text-rose-600 text-xs font-semibold px-4 py-2.5 rounded-xl hover:bg-rose-50 transition-colors">Download on App Store</button>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer id="about" className="border-t border-slate-200 bg-slate-900">
        <div className="max-w-7xl mx-auto px-6 py-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
          <div>
            <div className="flex items-center gap-2 select-none">
              <div className="w-9 h-9 rounded-xl bg-teal-500 flex items-center justify-center text-white">
                <Home className="w-5 h-5" strokeWidth={2.5} />
              </div>
              <span className="text-lg font-extrabold tracking-tight text-white">{homeConfig.footer?.brandName || "CalServices"}</span>
            </div>
            <p className="text-xs text-slate-400 mt-3 leading-relaxed max-w-[220px]">
              {homeConfig.footer?.tagline || "Your trusted partner for all home services. Quality you can count on."}
            </p>
            <div className="flex gap-3 mt-4 text-slate-400 hover:[&>*]:text-teal-400">
              <FacebookMark className="w-4 h-4 cursor-pointer hover:text-teal-400 transition-colors" />
              <InstagramMark className="w-4 h-4 cursor-pointer hover:text-teal-400 transition-colors" />
              <YoutubeMark className="w-4 h-4 cursor-pointer hover:text-teal-400 transition-colors" />
              <TwitterMark className="w-4 h-4 cursor-pointer hover:text-teal-400 transition-colors" />
            </div>
          </div>
          <div>
            <p className="text-sm font-bold text-white mb-3">{homeConfig.footer?.servicesColTitle || "Services"}</p>
            <ul className="space-y-2 text-xs text-slate-400">
              {(homeConfig.footer?.servicesLinks || ["Home Services & Pest Control", "Paintings", "Mason", "AC & Appliance"]).map((link, idx) => (
                <li key={idx} className="hover:text-white cursor-pointer transition-colors">{link}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-sm font-bold text-white mb-3">{homeConfig.footer?.companyColTitle || "Company"}</p>
            <ul className="space-y-2 text-xs text-slate-400">
              {(homeConfig.footer?.companyLinks || ["About Us", "Careers", "Blog", "Become a Partner"]).map((link, idx) => (
                <li key={idx} className="hover:text-white cursor-pointer transition-colors">{link}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-sm font-bold text-white mb-3">{homeConfig.footer?.helpColTitle || "Need Help?"}</p>
            <ul className="space-y-2 text-xs text-slate-400">
              <li className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-teal-400" /> {homeConfig.footer?.phone || "+91 98765 43210"}</li>
              <li className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-teal-400" /> {homeConfig.footer?.email || "support@calservices.com"}</li>
              <li className="flex items-center gap-2"><Clock className="w-3.5 h-3.5 text-teal-400" /> {homeConfig.footer?.workingHours || "Mon – Sun (8 AM – 8 PM)"}</li>
            </ul>
          </div>
        </div>
      </footer>
    </div>

    <BkStyles />
    {activeCategory && (
      (activeCategory.id === "kitchen_cleaning" || activeCategory.slug === "kitchen_cleaning" || String(activeCategory.id) === "kitchen_cleaning" || activeCategory.name?.toLowerCase()?.includes("kitchen")) ? (
        <KitchenCleaningModal
          category={activeCategory}
          cart={modalCart}
          setCart={setModalCart}
          onClose={() => navigate("/home")}
          onCheckout={() => navigate(routes.booking_checkout, { state: { category: activeCategory, cart: resolveCartArg(null) } })}
        />
      ) : (activeCategory.id === "sofa_cleaning" || activeCategory.slug === "sofa_cleaning" || String(activeCategory.id) === "sofa_cleaning" || activeCategory.name?.toLowerCase()?.includes("sofa")) ? (
        <SofaCleaningModal
          category={activeCategory}
          cart={modalCart}
          setCart={setModalCart}
          onClose={() => navigate("/home")}
          onCheckout={(customCart) => navigate(routes.booking_checkout, { state: { category: activeCategory, cart: resolveCartArg(customCart) } })}
        />
      ) : (activeCategory.id === "bathroom_cleaning" || activeCategory.slug === "bathroom_cleaning" || String(activeCategory.id) === "bathroom_cleaning" || activeCategory.name?.toLowerCase()?.includes("bathroom")) ? (
        <BathroomCleaningModal
          category={activeCategory}
          cart={modalCart}
          setCart={setModalCart}
          onClose={() => navigate("/home")}
          onCheckout={(customCart) => navigate(routes.booking_checkout, { state: { category: activeCategory, cart: resolveCartArg(customCart) } })}
        />
      ) : (activeCategory.id === "painting" || activeCategory.slug === "painting" || String(activeCategory.id) === "painting" || activeCategory.name?.toLowerCase() === "painting") ? (
        <PaintingPackageModal
          category={activeCategory}
          cart={modalCart}
          setCart={setModalCart}
          packagesData={packagesData}
          onClose={() => navigate("/home")}
          onCheckout={(customCart) => {
            const finalCart = resolveCartArg(customCart);
            setModalCart(cleanConsultationItems(finalCart));
            navigate(routes.booking_checkout, { state: { category: activeCategory, cart: finalCart } });
          }}
          onGetEstimate={(customCart) => {
            const finalCart = resolveCartArg(customCart);
            setModalCart(cleanConsultationItems(finalCart));
            navigate(routes.booking_checkout, { state: { category: activeCategory, cart: finalCart, triggerLocPicker: true } });
          }}
        />
      ) : (activeCategory.id === "mason" || activeCategory.slug === "mason" || String(activeCategory.id) === "mason" || activeCategory.name?.toLowerCase() === "mason") ? (
        <MasonPackageModal
          category={activeCategory}
          cart={modalCart}
          setCart={setModalCart}
          packagesData={packagesData}
          onClose={() => navigate("/home")}
          onCheckout={(customCart) => {
            const finalCart = resolveCartArg(customCart);
            setModalCart(cleanConsultationItems(finalCart));
            navigate(routes.booking_checkout, { state: { category: activeCategory, cart: finalCart } });
          }}
          onGetEstimate={(customCart) => {
            const finalCart = resolveCartArg(customCart);
            setModalCart(cleanConsultationItems(finalCart));
            navigate(routes.booking_checkout, { state: { category: activeCategory, cart: finalCart, triggerLocPicker: true } });
          }}
        />
      ) : (
        <CustomCleaningPackageModal
          category={activeCategory}
          cart={modalCart}
          setCart={setModalCart}
          onClose={() => navigate("/home")}
          onCheckout={(customCart) => {
            const finalCart = resolveCartArg(customCart);
            setModalCart(cleanConsultationItems(finalCart));
            navigate(routes.booking_checkout, { state: { category: activeCategory, cart: finalCart } });
          }}
        />
      )
    )}

      <CustomerEntryFlowModal
        isOpen={showCustomerEntryModal}
        onClose={() => setShowCustomerEntryModal(false)}
        onComplete={() => {
          setShowCustomerEntryModal(false)
          if (typeof refreshMe === "function") refreshMe()
        }}
      />

      <AnimatePresence>
        {showAccountPortal && (
          <CustomerAccountModal
            activeTab={activeAccountTab}
            onChangeTab={setActiveAccountTab}
            onClose={() => setShowAccountPortal(false)}
          />
        )}
      </AnimatePresence>

      {/* Urban Company Style Floating Bottom Cart Bar */}
      {modalCart && modalCart.length > 0 && !activeCategory && !isGoodsModalOpen && !isElecModalOpen && !isAcModalOpen && !isHomePestModalOpen && !isForYouModalOpen && !isFoodHealthModalOpen && !isHomeServicesCombinedModalOpen && (
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[9995] w-[92%] max-w-lg bg-slate-900 text-white rounded-2xl p-3.5 shadow-2xl border border-slate-800 flex items-center justify-between gap-4 backdrop-blur-lg"
        >
          {/* Cart Item Count & Total Price */}
          <div className="flex items-center gap-3 pl-1">
            <div className="relative w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0">
              <ShoppingCart size={18} />
              <span className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-slate-950 font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-slate-900 shadow-xs">
                {modalCart.reduce((sum, i) => sum + i.quantity, 0)}
              </span>
            </div>
            <div>
              <div className="text-xs font-bold text-slate-300">
                {modalCart.reduce((sum, i) => sum + i.quantity, 0)} {modalCart.reduce((sum, i) => sum + i.quantity, 0) === 1 ? "Service" : "Services"} Added
              </div>
              <div className="text-sm font-black text-white">
                ₹{modalCart.reduce((sum, i) => sum + (i.price * i.quantity), 0).toLocaleString("en-IN")}
              </div>
            </div>
          </div>

          {/* View Cart / Proceed Action Button */}
          <button
            type="button"
            onClick={() => navigate(routes.booking_checkout, { state: { category: activeCategory, cart: modalCart } })}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-600/30 transition-all cursor-pointer active:scale-95 shrink-0 uppercase tracking-wider"
          >
            <span>View Cart</span>
            <ChevronRight size={15} strokeWidth={3} />
          </button>
        </motion.div>
      )}

      {showLocationPickerModal && (
        <AddAddressSearchModal
          onClose={() => setShowLocationPickerModal(false)}
          onSelectLocation={async (locStr) => {
            setShowLocationPickerModal(false)
            if (locStr) {
              const labelStr = typeof locStr === "string" ? locStr : (locStr?.formatted_address || locStr?.locality || locStr?.city || "")
              setActiveLocationLabel(labelStr)
              localStorage.setItem("calservice_user_location", labelStr)
              if (user) {
                try {
                  await apiUpdateCustomerLastLocation({
                    label: labelStr,
                    detected_at: new Date().toISOString()
                  })
                } catch (e) { }
                if (typeof refreshMe === "function") refreshMe()
              }
            }
          }}
        />
      )}
    </>
  )
}
