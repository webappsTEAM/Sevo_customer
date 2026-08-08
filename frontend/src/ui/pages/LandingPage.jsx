import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { useNavigate, useSearchParams, useLocation } from "react-router-dom"
import {
  Home, PaintRoller,
  SprayCan, Building2, AirVent, Hammer, Boxes,
  ShieldCheck, BadgeCheck, Clock, Award, Headphones,
  Star, Search, MapPin, ChevronDown, ChevronLeft, ChevronRight,
  Smartphone, Phone, Mail, X, ArrowRight,
  ClipboardList, CalendarDays, UserCheck, DoorOpen, Wallet, User,
} from "lucide-react"
import { routes } from "../routes.js"
import { CustomerEntryFlowModal } from "../components/CustomerEntryFlowModal.jsx"
import { PackageModal, CustomCleaningPackageModal, KitchenCleaningModal, PaintingPackageModal, BkStyles, CustomerAccountModal, AddAddressSearchModal, CATEGORIES as BOOKING_CATEGORIES } from "./BookingPage.jsx"
import { useAuth } from "../../state/auth/useAuth.js"
import { apiUpdateCustomerLastLocation } from "../../api/authService.js"
import { AnimatePresence } from "framer-motion"

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

// ── Real photos already in the project (public/mockups) ─────────────────
const CATEGORIES = [
  { label: "Home Services & Pest Control", icon: SprayCan, photo: "/mockups/service_cleaning.png", bg: "bg-indigo-50", ring: "border-indigo-100", fg: "text-indigo-600", hoverBg: "group-hover:bg-indigo-100", serviceCategoryId: "pest_control" },
  { label: "Paintings", icon: PaintRoller, photo: "/mockups/service_maintenance.png", bg: "bg-amber-50", ring: "border-amber-100", fg: "text-amber-600", hoverBg: "group-hover:bg-amber-100", serviceCategoryId: "painting" },
  { label: "Mason", icon: Building2, photo: "/mockups/service_building.png", bg: "bg-sky-50", ring: "border-sky-100", fg: "text-sky-600", hoverBg: "group-hover:bg-sky-100", serviceCategoryId: null },
  { label: "AC & Appliance", icon: AirVent, photo: "/mockups/service_hvac.png", bg: "bg-rose-50", ring: "border-rose-100", fg: "text-rose-600", hoverBg: "group-hover:bg-rose-100", serviceCategoryId: "hvac" },
  { label: "Electrician, Plumbing & Carpentry", icon: Hammer, photo: "/mockups/service_electrical.png", bg: "bg-violet-50", ring: "border-violet-100", fg: "text-violet-600", hoverBg: "group-hover:bg-violet-100", serviceCategoryId: "electrical" },
  { label: "Goods & Transports", icon: Boxes, photo: "/mockups/service_transport.jpg", bg: "bg-teal-50", ring: "border-teal-100", fg: "text-teal-600", hoverBg: "group-hover:bg-teal-100", serviceCategoryId: null },
]

const HOME_SERVICES_SUB = [
  { name: "Full house Cleaning", graphic: FullHouseCleaningGraphic, categoryId: "cleaning" },
  { name: "Kitchen Cleaning", graphic: KitchenCleaningGraphic, categoryId: "cleaning", badge: "55 mins" },
  { name: "Living & Bedroom Cleaning", graphic: BedroomCleaningGraphic, categoryId: "cleaning" },
  { name: "Sofa Cleaning", graphic: SofaCleaningGraphic, categoryId: "cleaning" },
  { name: "Bathroom Cleaning", graphic: BathroomCleaningGraphic, categoryId: "cleaning" },
  { name: "Weekly Cleaning", graphic: WeeklyCleaningGraphic, categoryId: "cleaning" },
]

const PEST_CONTROL_SUB = [
  { name: "Cockroach Control", graphic: CockroachControlGraphic, categoryId: "pest_control" },
  { name: "Termite Control", graphic: TermiteControlGraphic, categoryId: "pest_control" },
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
  const [modalCart, setModalCart] = useState(location.state?.cart || [])
  const [isGoodsModalOpen, setIsGoodsModalOpen] = useState(location.state?.openGoodsModal || false)
  const [isElecModalOpen, setIsElecModalOpen] = useState(location.state?.openElecModal || false)
  const [isAcModalOpen, setIsAcModalOpen] = useState(location.state?.openAcModal || false)
  const [isHomePestModalOpen, setIsHomePestModalOpen] = useState(location.state?.openHomePestModal || false)
  const [showCustomerEntryModal, setShowCustomerEntryModal] = useState(false)
  const [showAccountPortal, setShowAccountPortal] = useState(false)
  const [activeAccountTab, setActiveAccountTab] = useState("My Profile")
  const [showLocationPickerModal, setShowLocationPickerModal] = useState(false)
  const [activeLocationLabel, setActiveLocationLabel] = useState(null)

  useEffect(() => {
    if (location.state?.openHomePestModal) setIsHomePestModalOpen(true)
    if (location.state?.openAcModal) setIsAcModalOpen(true)
    if (location.state?.openElecModal) setIsElecModalOpen(true)
    if (location.state?.openGoodsModal) setIsGoodsModalOpen(true)
  }, [location.state])

  const handleCloseCategory = () => {
    const rawCatKey = (activeCategory?.id || activeCategory?.slug || activeCategoryId || "").toLowerCase()
    if (["hvac", "ac", "appliance"].some(k => rawCatKey.includes(k))) {
      navigate("/home", { state: { openAcModal: true } })
    } else if (["electrical", "plumbing", "carpentry", "elec"].some(k => rawCatKey.includes(k))) {
      navigate("/home", { state: { openElecModal: true } })
    } else if (["goods", "transport"].some(k => rawCatKey.includes(k))) {
      navigate("/home", { state: { openGoodsModal: true } })
    } else {
      navigate("/home", { state: { openHomePestModal: true } })
    }
  }

  const goToBooking = () => navigate(routes.booking)
  const goToLogin = () => setShowCustomerEntryModal(true)
  const goToCategoryServices = (serviceCategoryId) => {
    navigate(serviceCategoryId ? `${routes.booking_services}?category=${serviceCategoryId}` : routes.booking_services)
  }

  // Category clicked on this page opens the existing package/services
  // popup right here, instead of navigating to the old BookingPage UI.
  const activeCategoryId = searchParams.get("category")
  const activeCategory = activeCategoryId
    ? BOOKING_CATEGORIES.find(c => c.id === activeCategoryId)
    : null

  // Close popup on Escape key and prevent background scroll when open
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setIsGoodsModalOpen(false)
        setIsElecModalOpen(false)
        setIsAcModalOpen(false)
        setIsHomePestModalOpen(false)
      }
    }
    if (isGoodsModalOpen || isElecModalOpen || isAcModalOpen || isHomePestModalOpen) {
      window.addEventListener("keydown", handleKeyDown)
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = ""
    }
  }, [isGoodsModalOpen, isElecModalOpen, isAcModalOpen, isHomePestModalOpen])

  if (activeCategoryId && activeCategoryId !== "painting") {
    return (
      <>
      <div className="min-h-screen bg-[#F7FAF9] text-slate-800 flex flex-col" style={{ animation: "fadeUp 0.4s ease both" }}>
        {/* Header */}
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-100">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-6">
            <Logo />
            <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-slate-600">
              <a href="#home" className="text-emerald-600 font-semibold" onClick={() => navigate("/home")}>Home</a>
              <a href="#categories" className="hover:text-slate-900" onClick={() => navigate("/home")}>Services</a>
              <a href="#how-it-works" className="hover:text-slate-900" onClick={() => navigate("/home")}>How It Works</a>
              <a href="#professionals" className="hover:text-slate-900" onClick={() => navigate("/home")}>Professionals</a>
              <a href="#about" className="hover:text-slate-900" onClick={() => navigate("/home")}>About Us</a>
            </nav>
            <div className="flex items-center gap-3">
              {user ? (
                <button
                  type="button"
                  onClick={() => {
                    setActiveAccountTab("My Profile")
                    setShowAccountPortal(true)
                  }}
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-950 font-black text-xs transition-all shadow-2xs cursor-pointer"
                >
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-black text-[10px] shrink-0">
                    <User size={13} />
                  </div>
                  <span className="hidden sm:inline font-extrabold">
                    Hi, {user?.full_name || user?.fullName || user?.first_name || user?.firstName || user?.username || "Customer"} 👋
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={goToLogin}
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs transition-all shadow-sm cursor-pointer"
                >
                  <User size={14} />
                  <span>Login / Sign Up</span>
                </button>
              )}
              <button onClick={goToBooking} className="btn btnPrimary bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2 rounded-full transition-colors cursor-pointer">
                Book Service
              </button>
            </div>
          </div>
        </header>

        {/* Full Page View Wrapper */}
        <main className={`flex-1 max-w-7xl w-full mx-auto px-6 ${activeCategory ? "pt-4 pb-10" : "py-10"}`}>
          {activeCategory && activeCategory.id === "kitchen_cleaning" && (
            <KitchenCleaningModal
              category={activeCategory}
              cart={modalCart}
              setCart={setModalCart}
              onClose={handleCloseCategory}
              onCheckout={() => navigate(routes.booking_checkout, { state: { category: activeCategory, cart: modalCart } })}
            />
          )}
          {activeCategory && activeCategory.id !== "kitchen_cleaning" && (
            <CustomCleaningPackageModal
              category={activeCategory}
              cart={modalCart}
              setCart={setModalCart}
              isFullPage={true}
              onClose={handleCloseCategory}
              onCheckout={() => navigate(routes.booking_checkout, { state: { category: activeCategory, cart: modalCart } })}
            />
          )}
        </main>

        {/* Footer */}
        <footer className="bg-slate-50 border-t border-slate-100 py-12">
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white font-black flex items-center justify-center">C</div>
                <span className="font-extrabold text-slate-800 text-base">CalServices</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed max-w-xs">
                Your trusted partner for professional home services. Quality service, transparent pricing, and trusted professionals.
              </p>
              <div className="flex gap-3 mt-4 text-slate-400">
                <FacebookMark className="w-4 h-4" />
                <InstagramMark className="w-4 h-4" />
                <YoutubeMark className="w-4 h-4" />
                <TwitterMark className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 mb-3">Services</p>
              <ul className="space-y-2 text-xs text-slate-500">
                {CATEGORIES.slice(0, 4).map((c) => <li key={c.label}>{c.label}</li>)}
              </ul>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 mb-3">Company</p>
              <ul className="space-y-2 text-xs text-slate-500">
                <li>About Us</li><li>Careers</li><li>Blog</li><li>Become a Partner</li>
              </ul>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 mb-3">Need Help?</p>
              <ul className="space-y-2 text-xs text-slate-500">
                <li className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-emerald-600" /> +91 98765 43210</li>
                <li className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-emerald-600" /> support@calservices.com</li>
                <li className="flex items-center gap-2"><Clock className="w-3.5 h-3.5 text-emerald-600" /> Mon &ndash; Sun (8 AM &ndash; 8 PM)</li>
              </ul>
            </div>
          </div>
        </footer>
      </div>
      <BkStyles />
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
            {/* Location Selector (Urban Company Style) */}
            <button
              type="button"
              onClick={() => setShowLocationPickerModal(true)}
              className="flex items-center gap-2 text-slate-800 hover:text-slate-950 font-medium text-sm transition-colors cursor-pointer group"
              title="Location"
            >
              <MapPin className="w-5 h-5 text-slate-700 stroke-[1.75] shrink-0 group-hover:text-slate-900 transition-colors" />
              <span className="truncate max-w-[180px] font-semibold text-slate-800">
                {(() => {
                  if (activeLocationLabel) return activeLocationLabel
                  const locObj = user?.last_known_location || user?.lastKnownLocation
                  if (locObj) {
                    if (typeof locObj === "string" && locObj.trim()) return locObj
                    if (locObj.label) return locObj.label
                  }
                  if (user?.address) return user.address
                  return "Set location"
                })()}
              </span>
              <ChevronDown className="w-4 h-4 text-slate-600 stroke-[2] shrink-0 group-hover:text-slate-900 transition-colors" />
            </button>

            {/* User Profile / Login (Urban Company Style) */}
            {user ? (
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
            ) : (
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
            )}
          </div>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────── */}
      <section id="home" className="max-w-7xl mx-auto px-6 pt-14 pb-16 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <p className="text-sm font-medium text-teal-600 mb-4">
            Reliable. Affordable. Right at Your Doorstep.
          </p>
          <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight text-slate-900 mb-5">
            Professional<br />
            <span className="text-teal-600">Services</span><br />
            Made Simple
          </h1>
          <p className="text-slate-500 text-base mb-8 max-w-md">
            Quick booking. Quality work. Guaranteed satisfaction.
          </p>

          <form
            onSubmit={(e) => { e.preventDefault(); goToBooking() }}
            className="flex items-center bg-white rounded-2xl shadow-sm border border-slate-200 p-1.5 mb-6 max-w-xl"
          >
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="What service do you need?"
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
            <span className="inline-flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-teal-600" /> Verified Pros</span>
            <span className="inline-flex items-center gap-1.5"><Star className="w-4 h-4 text-amber-500" /> 4.8★ Rated</span>
            <span className="inline-flex items-center gap-1.5"><Award className="w-4 h-4 text-rose-500" /> 1M+ Happy Homes</span>
            <span className="inline-flex items-center gap-1.5"><Clock className="w-4 h-4 text-violet-500" /> 30-Day Guarantee</span>
          </div>
        </div>

        {/* Real photo collage */}
        <div className="relative h-[420px] hidden sm:block">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-100 via-violet-50 to-orange-50 rounded-[3rem] -z-10" />
          <img
            src="/mockups/service_hvac.png"
            alt="Technician servicing an AC unit"
            className="absolute top-0 left-0 w-[62%] h-[65%] object-cover rounded-3xl shadow-lg border-4 border-white"
          />
          <img
            src="/mockups/service_electrical.png"
            alt="Electrician at work"
            className="absolute bottom-0 left-[8%] w-[48%] h-[45%] object-cover rounded-3xl shadow-lg border-4 border-white"
          />
          <img
            src="/mockups/service_cleaning.png"
            alt="Home cleaning professional"
            className="absolute top-[8%] right-0 w-[46%] h-[52%] object-cover rounded-3xl shadow-lg border-4 border-white"
          />
          <img
            src="/mockups/service_plumbing.png"
            alt="Plumber fixing a sink"
            className="absolute bottom-[4%] right-[2%] w-[42%] h-[42%] object-cover rounded-3xl shadow-lg border-4 border-white"
          />
        </div>
      </section>

      {/* ── Browse by Category ─────────────────────────────── */}
      <section id="categories" className="max-w-7xl mx-auto px-6 py-10">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-900">Browse by Category</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {CATEGORIES.map(({ label, icon: Icon, photo, serviceCategoryId }) => (
            <button
              key={label}
              onClick={() => {
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
              className="group flex flex-col bg-white rounded-2xl border border-slate-100 overflow-hidden text-center hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              {photo ? (
                <div className="h-24 w-full overflow-hidden">
                  <img
                    src={photo}
                    alt={label}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              ) : (
                <div className="h-24 w-full bg-emerald-50 flex items-center justify-center">
                  <Icon className="w-8 h-8 text-emerald-600" strokeWidth={1.5} />
                </div>
              )}
              <span className="text-xs font-semibold text-slate-700 leading-snug p-3">{label}</span>
            </button>
          ))}
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
                        } else {
                          navigate(`?category=${item.categoryId}`)
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
                        navigate(`?category=${item.categoryId}`)
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
                    goToCategoryServices("hvac")
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
                    goToCategoryServices("appliance_repair")
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
                    goToCategoryServices("appliance_repair")
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
                    goToCategoryServices("appliance_repair")
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
                    goToCategoryServices("appliance_repair")
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
              <span className="text-lg font-extrabold tracking-tight text-white">CalServices</span>
            </div>
            <p className="text-xs text-slate-400 mt-3 leading-relaxed max-w-[220px]">
              Your trusted partner for all home services. Quality you can count on.
            </p>
            <div className="flex gap-3 mt-4 text-slate-400 hover:[&>*]:text-teal-400">
              <FacebookMark className="w-4 h-4 cursor-pointer hover:text-teal-400 transition-colors" />
              <InstagramMark className="w-4 h-4 cursor-pointer hover:text-teal-400 transition-colors" />
              <YoutubeMark className="w-4 h-4 cursor-pointer hover:text-teal-400 transition-colors" />
              <TwitterMark className="w-4 h-4 cursor-pointer hover:text-teal-400 transition-colors" />
            </div>
          </div>
          <div>
            <p className="text-sm font-bold text-white mb-3">Services</p>
            <ul className="space-y-2 text-xs text-slate-400">
              {CATEGORIES.slice(0, 4).map((c) => <li key={c.label} className="hover:text-white cursor-pointer transition-colors">{c.label}</li>)}
            </ul>
          </div>
          <div>
            <p className="text-sm font-bold text-white mb-3">Company</p>
            <ul className="space-y-2 text-xs text-slate-400">
              <li className="hover:text-white cursor-pointer transition-colors">About Us</li>
              <li className="hover:text-white cursor-pointer transition-colors">Careers</li>
              <li className="hover:text-white cursor-pointer transition-colors">Blog</li>
              <li className="hover:text-white cursor-pointer transition-colors">Become a Partner</li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-bold text-white mb-3">Need Help?</p>
            <ul className="space-y-2 text-xs text-slate-400">
              <li className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-teal-400" /> +91 98765 43210</li>
              <li className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-teal-400" /> support@calservices.com</li>
              <li className="flex items-center gap-2"><Clock className="w-3.5 h-3.5 text-teal-400" /> Mon &ndash; Sun (8 AM &ndash; 8 PM)</li>
            </ul>
          </div>
        </div>
      </footer>
    </div>

    <BkStyles />
    {activeCategory && (
      (activeCategory.id === "painting" || activeCategory.slug === "painting" || String(activeCategory.id) === "painting" || activeCategory.name?.toLowerCase() === "painting") ? (
        <PaintingPackageModal
          category={activeCategory}
          cart={modalCart}
          setCart={setModalCart}
          onClose={() => navigate(routes.booking_services)}
          onCheckout={() => navigate(routes.booking_checkout, { state: { category: activeCategory, cart: modalCart } })}
        />
      ) : (
        <PackageModal
          category={activeCategory}
          cart={modalCart}
          setCart={setModalCart}
          packagesData={{}}
          onClose={() => navigate(routes.booking_services)}
          onCheckout={() => navigate(routes.booking_checkout, { state: { category: activeCategory, cart: modalCart } })}
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

    {showLocationPickerModal && (
      <AddAddressSearchModal
        onClose={() => setShowLocationPickerModal(false)}
        onSelectLocation={async (locStr) => {
          setShowLocationPickerModal(false)
          if (locStr) {
            setActiveLocationLabel(locStr)
            if (user) {
              try {
                await apiUpdateCustomerLastLocation({
                  label: locStr,
                  detected_at: new Date().toISOString()
                })
              } catch (e) {}
              if (typeof refreshMe === "function") refreshMe()
            }
          }
        }}
        onUseCurrentLocation={() => {
          setShowLocationPickerModal(false)
        }}
      />
    )}
    </>
  )
}
